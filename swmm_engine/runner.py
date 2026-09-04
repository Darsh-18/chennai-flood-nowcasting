import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

from pyswmm import Simulation, Nodes, Links


def _read_inp_spatial_metadata(inp_path: str) -> Dict[str, Any]:
    """Read only the GIS-relevant records from a SWMM input file.

    SWMM's ``[COORDINATES]`` section has no CRS field.  Its x/y values are
    therefore returned exactly as model coordinates, but are *not* promoted
    to latitude/longitude unless a future model explicitly supplies a CRS.
    """
    coordinates: Dict[str, Dict[str, float]] = {}
    conduits: Dict[str, Dict[str, str]] = {}
    options: Dict[str, str] = {}
    section = ""

    with open(inp_path, encoding="utf-8") as fh:
        for raw_line in fh:
            line = raw_line.split(";", 1)[0].strip()
            if not line:
                continue
            if line.startswith("[") and line.endswith("]"):
                section = line.upper()
                continue

            fields = line.split()
            if section == "[COORDINATES]" and len(fields) >= 3:
                try:
                    coordinates[fields[0]] = {
                        "x": float(fields[1]),
                        "y": float(fields[2]),
                    }
                except ValueError:
                    # Preserve the simulation result even if a malformed
                    # optional coordinate record is present.
                    continue
            elif section == "[CONDUITS]" and len(fields) >= 3:
                conduits[fields[0]] = {
                    "from_node": fields[1],
                    "to_node": fields[2],
                }
            elif section == "[OPTIONS]" and len(fields) >= 2:
                options[fields[0].upper()] = fields[1]

    def option_datetime(date_key: str, time_key: str) -> Optional[str]:
        date_value, time_value = options.get(date_key), options.get(time_key)
        if not date_value or not time_value:
            return None
        try:
            return datetime.strptime(
                f"{date_value} {time_value}", "%m/%d/%Y %H:%M:%S"
            ).isoformat()
        except ValueError:
            return None

    return {
        "coordinates": coordinates,
        "conduits": conduits,
        "simulation_start": option_datetime("START_DATE", "START_TIME"),
        "simulation_end": option_datetime("END_DATE", "END_TIME"),
    }


def _rainfall_event_metadata(rainfall_csv_path: Optional[str]) -> Optional[Dict[str, str]]:
    """Return traceable provenance for externally injected rainfall only."""
    if rainfall_csv_path is None:
        return None
    rainfall_path = Path(rainfall_csv_path)
    return {
        "event_id": rainfall_path.stem,
        # Preserve the caller-provided reference verbatim for traceability.
        "source_path": rainfall_csv_path,
    }


def prepare_scenario_inp(
    base_inp_path: str,
    target_inp_path: str,
    scenario_name: str,
    config_path: str = "swmm_engine/config/default_params.json",
) -> Dict[str, Any]:
    """Create a scenario-specific SWMM input without altering the base model.

    Scenario multipliers in ``default_params.json`` are explicitly defined as
    Manning's roughness multipliers.  They are applied to the roughness field
    of every [CONDUITS] record before EPA SWMM is opened.
    """
    if not os.path.exists(base_inp_path):
        raise FileNotFoundError(f"SWMM template .inp not found: {base_inp_path}")

    with open(config_path, "r", encoding="utf-8") as fh:
        config_data = json.load(fh)

    scenario = config_data.get("scenarios", {}).get(scenario_name)
    if scenario is None:
        raise ValueError(f"Unknown scenario: {scenario_name}")
    multiplier = float(scenario["roughness_multiplier"])

    with open(base_inp_path, encoding="utf-8") as fh:
        base_lines = fh.readlines()

    output_lines: list[str] = []
    in_conduits = False
    applied_roughness: Dict[str, Dict[str, float]] = {}

    for raw_line in base_lines:
        stripped = raw_line.strip()
        if stripped.startswith("["):
            in_conduits = stripped.upper() == "[CONDUITS]"
            output_lines.append(raw_line)
            continue

        if in_conduits and stripped and not stripped.startswith(";"):
            fields = raw_line.split()
            if len(fields) < 5:
                raise ValueError(
                    f"Invalid [CONDUITS] record in {base_inp_path}: {stripped}"
                )
            base_roughness = float(fields[4])
            adjusted_roughness = base_roughness * multiplier
            fields[4] = f"{adjusted_roughness:.8g}"
            output_lines.append("  ".join(fields) + "\n")
            applied_roughness[fields[0]] = {
                "base": base_roughness,
                "adjusted": adjusted_roughness,
            }
        else:
            output_lines.append(raw_line)

    target_dir = os.path.dirname(target_inp_path)
    if target_dir:
        os.makedirs(target_dir, exist_ok=True)
    with open(target_inp_path, "w", encoding="utf-8") as fh:
        fh.writelines(output_lines)

    return {
        "scenario": scenario_name,
        "roughness_multiplier": multiplier,
        "conduit_roughness": applied_roughness,
    }


def run_swmm_simulation(
    inp_path: str = "swmm_engine/models/pilot_network.inp",
    scenario_name: str = "normal",
    config_path: str = "swmm_engine/config/default_params.json",
    scenario_applied: bool = False,
    rainfall_csv_path: Optional[str] = None,
) -> Dict[str, Any]:
    if not os.path.exists(inp_path):
        return {"status": "failed", "error": f"File not found: {inp_path}"}

    with open(config_path, "r", encoding="utf-8") as f:
        config_data = json.load(f)

    if scenario_name not in config_data.get("scenarios", {}):
        return {
            "status": "failed",
            "error": f"Unknown scenario: {scenario_name}",
        }

    if not scenario_applied:
        prepared_inp_path = os.path.join(
            "swmm_engine", "outputs", f"prepared_{scenario_name}.inp"
        )
        try:
            prepare_scenario_inp(
                base_inp_path=inp_path,
                target_inp_path=prepared_inp_path,
                scenario_name=scenario_name,
                config_path=config_path,
            )
        except (FileNotFoundError, ValueError) as exc:
            return {"status": "failed", "error": "Scenario preparation failure", "details": str(exc)}
        inp_path = prepared_inp_path

    spatial_metadata = _read_inp_spatial_metadata(inp_path)
    rainfall_event = _rainfall_event_metadata(rainfall_csv_path)

    try:
        with Simulation(inp_path) as sim:
            nodes = Nodes(sim)
            links = Links(sim)
            # PySWMM 2.x collection iterators are consumed after one pass.
            # Retain IDs, then retrieve each live object by ID at every step.
            node_ids = [node.nodeid for node in nodes]
            link_ids = [link.linkid for link in links]

            # Tracking dictionaries
            node_max_depth: Dict[str, float] = {}
            node_max_flooding: Dict[str, float] = {}
            conduit_max_flow: Dict[str, float] = {}

            for step in sim:
                for nid in node_ids:
                    node = nodes[nid]
                    node_max_depth[nid] = max(
                        node_max_depth.get(nid, 0.0), node.depth
                    )
                    node_max_flooding[nid] = max(
                        node_max_flooding.get(nid, 0.0), node.flooding
                    )

                for lid in link_ids:
                    link = links[lid]
                    conduit_max_flow[lid] = max(
                        conduit_max_flow.get(lid, 0.0), link.flow
                    )

        # Build result lists
        node_results = []
        for nid in node_max_depth:
            coordinate = spatial_metadata["coordinates"].get(nid)
            node_results.append(
                {
                    # ``id`` remains for existing API consumers; the explicit
                    # name is the GIS integration contract.
                    "id": nid,
                    "node_id": nid,
                    "x": coordinate["x"] if coordinate else None,
                    "y": coordinate["y"] if coordinate else None,
                    # A SWMM .inp has no CRS declaration. Never infer WGS84
                    # from values that merely resemble longitude/latitude.
                    "latitude": None,
                    "longitude": None,
                    "max_depth_m": round(node_max_depth[nid], 4),
                    "max_flooding_cms": round(node_max_flooding[nid], 6),
                    "flooded": node_max_flooding[nid] > 0.0,
                }
            )

        conduit_results = []
        for lid in conduit_max_flow:
            conduit_definition = spatial_metadata["conduits"].get(lid, {})
            conduit_results.append(
                {
                    "id": lid,
                    "conduit_id": lid,
                    "from_node": conduit_definition.get("from_node"),
                    "to_node": conduit_definition.get("to_node"),
                    "max_flow_cms": round(conduit_max_flow[lid], 6),
                }
            )

        flooded_nodes = sum(1 for n in node_results if n["flooded"])
        maximum_depth = max(
            (n["max_depth_m"] for n in node_results), default=0.0
        )

        return {
            "status": "success",
            "scenario": scenario_name,
            "simulation_start": spatial_metadata["simulation_start"],
            "simulation_end": spatial_metadata["simulation_end"],
            "rainfall_event": rainfall_event,
            "metadata": {
                "engine": "SWMM 5 (pyswmm)",
                "scenario": scenario_name,
                "simulation_start": spatial_metadata["simulation_start"],
                "simulation_end": spatial_metadata["simulation_end"],
                "rainfall_event": rainfall_event,
                "coordinate_reference_system": None,
                "coordinate_note": (
                    "x/y are read from the SWMM [COORDINATES] section. "
                    "No CRS is declared by this model, so latitude/longitude "
                    "are null rather than inferred."
                ),
                "assumptions": config_data.get("assumptions", {}),
            },
            "summary": {
                "total_nodes": len(node_results),
                "flooded_nodes": flooded_nodes,
                "maximum_depth_m": maximum_depth,
            },
            # Kept as a compatibility alias used by earlier pipeline checks.
            "max_system_depth_m": maximum_depth,
            "nodes": node_results,
            "conduits": conduit_results,
        }

    except Exception as e:
        return {
            "status": "failed",
            "error": "SWMM execution failure",
            "details": str(e),
        }
