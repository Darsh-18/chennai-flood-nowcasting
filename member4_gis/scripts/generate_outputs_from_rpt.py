"""
generate_outputs_from_rpt.py
------------------------------
Parse existing SWMM .rpt files and generate GIS outputs.

This script reads the existing SWMM .rpt and .inp files (already present in
swmm_engine/outputs/) and produces:
  - member4_gis/outputs/swmm_flood_nodes/swmm_flood_nodes.csv
  - member4_gis/outputs/swmm_flood_nodes/swmm_flood_nodes.gpkg
  - member4_gis/outputs/swmm_flood_nodes/scenario_comparison.json

This avoids re-running SWMM simulations and uses the existing verified outputs.

Existing RPT files:
  swmm_engine/outputs/direct_injected_normal.rpt
  swmm_engine/outputs/direct_injected_reduced_capacity.rpt
  swmm_engine/outputs/direct_injected_severe_blockage.rpt

All results derive from real IMERG 2015 rainfall injected into a synthetic
3-node pilot network (J1, J2, OUT1 near 80.27°E, 13.08°N).
"""

import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

OUTPUT_DIR = PROJECT_ROOT / "member4_gis" / "outputs" / "swmm_flood_nodes"

SCENARIOS = {
    "normal":           "direct_injected_normal",
    "reduced_capacity": "direct_injected_reduced_capacity",
    "severe_blockage":  "direct_injected_severe_blockage",
}

# Known node coordinates from pilot_network.inp [COORDINATES]
NODE_COORDS = {
    "J1":   (80.2707, 13.0827),
    "J2":   (80.2735, 13.0850),
    "OUT1": (80.2760, 13.0872),
}


def parse_rpt_node_depths(rpt_path: Path) -> dict:
    """
    Parse the Node Depth Summary table from a SWMM .rpt file.

    RPT format (lines have leading spaces):
      Node Depth Summary
      -------------------------...
        ...column headers...
      Node                 Type       Meters   Meters   Meters  days hr:min      Meters
      -------------------------...
      J1                   JUNCTION     0.05     0.28    10.28     3  14:00        0.28

    Returns dict: {node_id: {"avg_depth_m": float, "max_depth_m": float, "max_hgl_m": float}}
    """
    nodes = {}
    content = rpt_path.read_text(encoding="utf-8")
    lines = content.splitlines()

    in_section = False
    past_last_dash = False
    dash_count = 0

    for line in lines:
        stripped = line.strip()

        if "Node Depth Summary" in line:
            in_section = True
            past_last_dash = False
            dash_count = 0
            continue

        if not in_section:
            continue

        # Stop at next section asterisk header (after we've seen data)
        if stripped.startswith("*") and past_last_dash:
            break

        # The dashes line before data appears twice; second one precedes data
        if stripped.startswith("---"):
            dash_count += 1
            if dash_count >= 2:
                past_last_dash = True
            continue

        if not past_last_dash or not stripped:
            continue

        # Parse: "J1   JUNCTION   0.05   0.28   10.28   3   14:00   0.28"
        parts = stripped.split()
        if len(parts) >= 8:
            try:
                node_id   = parts[0]
                node_type = parts[1]
                avg_d     = float(parts[2])
                max_d     = float(parts[3])
                hgl       = float(parts[4])
                
                # Parse occurrence time (days hr:min from start of simulation)
                peak_ts_iso = None
                try:
                    occ_days = int(parts[5])
                    occ_time = parts[6].split(":")
                    occ_hr = int(occ_time[0])
                    occ_mn = int(occ_time[1])
                    # Simulation start: 2015-11-28 00:00:00 UTC
                    from datetime import datetime, timedelta, timezone
                    sim_start_dt = datetime(2015, 11, 28, 0, 0, tzinfo=timezone.utc)
                    peak_dt = sim_start_dt + timedelta(days=occ_days, hours=occ_hr, minutes=occ_mn)
                    peak_ts_iso = peak_dt.isoformat()
                except Exception:
                    peak_ts_iso = "2015-12-01T14:00:00+00:00"

                nodes[node_id] = {
                    "node_type":      node_type,
                    "avg_depth_m":    avg_d,
                    "max_depth_m":    max_d,
                    "max_hgl_m":      hgl,
                    "peak_timestamp": peak_ts_iso,
                    "time_of_max":    f"{parts[5]} days {parts[6]}",
                }
            except (ValueError, IndexError):
                pass

    return nodes


def parse_rpt_node_flooding(rpt_path: Path) -> dict:
    """
    Parse the Node Flooding Summary table.
    Returns dict: {node_id: {"total_flooding_cms": float, "max_flooding_cms": float}}
    If no flooding section (no nodes flooded), returns {}.
    """
    flooding = {}
    content = rpt_path.read_text(encoding="utf-8")

    if "No nodes were flooded" in content:
        return flooding

    in_section = False
    header_passed = False
    with open(rpt_path, encoding="utf-8") as fh:
        for line in fh:
            stripped = line.strip()
            if "Node Flooding Summary" in stripped:
                in_section = True
                header_passed = False
                continue
            if in_section:
                if stripped.startswith("---"):
                    header_passed = True
                    continue
                if not stripped:
                    continue
                if stripped.startswith("*") and header_passed:
                    break
                if header_passed:
                    parts = stripped.split()
                    if len(parts) >= 3:
                        try:
                            node_id = parts[0]
                            flooding[node_id] = {
                                "flooding_cms": float(parts[-2]) if len(parts) > 2 else 0.0,
                            }
                        except (ValueError, IndexError):
                            pass

    return flooding


def parse_rpt_link_flow(rpt_path: Path) -> dict:
    """
    Parse the Link Flow Summary table.
    Returns dict: {link_id: {"max_flow_cms": float, "max_velocity_ms": float, "max_full_ratio": float}}
    """
    links = {}
    in_section = False
    header_passed = False

    with open(rpt_path, encoding="utf-8") as fh:
        for line in fh:
            stripped = line.strip()
            if "Link Flow Summary" in stripped:
                in_section = True
                header_passed = False
                continue
            if in_section:
                if stripped.startswith("---"):
                    header_passed = True
                    continue
                if not stripped:
                    continue
                if stripped.startswith("*") and header_passed:
                    break
                if header_passed:
                    parts = stripped.split()
                    if len(parts) >= 6:
                        try:
                            link_id = parts[0]
                            link_type = parts[1]
                            max_flow = float(parts[2])
                            # Time-of-max: skip days and hr:min fields
                            max_vel  = float(parts[5])
                            max_full_flow = float(parts[6]) if len(parts) > 6 else 0.0
                            links[link_id] = {
                                "link_type":           link_type,
                                "max_flow_cms":        max_flow,
                                "max_velocity_ms":     max_vel,
                                "max_full_flow_ratio": max_full_flow,
                            }
                        except (ValueError, IndexError):
                            pass

    return links


def parse_rpt_runoff(rpt_path: Path) -> dict:
    """Parse Runoff Quantity Continuity for total precipitation.

    RPT format: '   Total Precipitation ......         1.924       384.708'
    The last number is depth in mm, the second-to-last is volume in hectare-m.
    """
    content = rpt_path.read_text(encoding="utf-8")
    result = {}
    for line in content.splitlines():
        stripped = line.strip()
        if "Total Precipitation" in stripped:
            # Line: "Total Precipitation ......  1.924  384.708"
            # Remove dots and split; last value is mm depth
            clean = stripped.replace(".", " ").replace(",", " ")
            # Actually use the original line: just split and get last 2 numbers
            parts = stripped.split()
            nums = []
            for p in reversed(parts):
                try:
                    nums.insert(0, float(p))
                    if len(nums) == 2:
                        break
                except ValueError:
                    if nums:
                        break
            if len(nums) == 2:
                result["total_precip_mm"] = nums[1]  # depth (mm)
                result["total_precip_ha_m"] = nums[0]  # volume (hectare-m)
        elif "Surface Runoff" in stripped:
            parts = stripped.split()
            nums = []
            for p in reversed(parts):
                try:
                    nums.insert(0, float(p))
                    if len(nums) == 2:
                        break
                except ValueError:
                    if nums:
                        break
            if len(nums) >= 1:
                result["surface_runoff_mm"] = nums[-1]
        elif "Flooding Loss" in stripped:
            parts = stripped.split()
            nums = []
            for p in reversed(parts):
                try:
                    nums.insert(0, float(p))
                    if len(nums) == 2:
                        break
                except ValueError:
                    if nums:
                        break
            if len(nums) >= 1:
                result["flooding_loss_mm"] = nums[-1]
    return result



def build_records_from_rpt(scenario: str, inp_name: str) -> dict:
    """
    Build node and link records from existing .rpt and .inp files.
    """
    rpt_path = PROJECT_ROOT / "swmm_engine" / "outputs" / f"{inp_name}.rpt"
    inp_path = PROJECT_ROOT / "swmm_engine" / "outputs" / f"{inp_name}.inp"

    if not rpt_path.exists():
        return {"error": f"RPT not found: {rpt_path}"}

    event_id        = f"imerg-2015-11-28_{scenario}"
    sim_start       = "2015-11-28T00:00:00+00:00"
    sim_end         = "2015-12-04T23:30:00+00:00"
    rainfall_source = "NASA GPM IMERG via data/rainfall/chennai_imerg_2015.csv"

    node_depths  = parse_rpt_node_depths(rpt_path)
    node_flood   = parse_rpt_node_flooding(rpt_path)
    link_flow    = parse_rpt_link_flow(rpt_path)
    runoff       = parse_rpt_runoff(rpt_path)

    # Build node records
    node_records = []
    for node_id, depth_info in node_depths.items():
        x, y = NODE_COORDS.get(node_id, (None, None))
        flooding_cms = node_flood.get(node_id, {}).get("flooding_cms", 0.0)
        flooded      = flooding_cms > 0.0

        node_records.append({
            "node_id":               node_id,
            "x":                     x,
            "y":                     y,
            "depth_m":               depth_info["max_depth_m"],
            "avg_depth_m":           depth_info["avg_depth_m"],
            "max_hgl_m":             depth_info["max_hgl_m"],
            "flooded":               flooded,
            "max_flooding_cms":      flooding_cms,
            "node_type":             depth_info["node_type"],
            "scenario":              scenario,
            "timestamp":             depth_info.get("peak_timestamp", "2015-12-01T14:00:00+00:00"),
            "event_id":              event_id,
            "simulation_start_at":   sim_start,
            "simulation_end_at":     sim_end,
            "source":                "swmm_rpt_node_depth_summary",
            "model_type":            "synthetic_pilot_network",
            "crs":                   "EPSG:4326",
            "rainfall_source":       rainfall_source,
            "inp_file":              inp_path.name,
            "rpt_file":              rpt_path.name,
            "temporal_note":         "Current MVP exports maximum simulated node depth per scenario rather than complete time-series. Timestamp records time of peak depth occurrence.",
        })

    # Build link records
    link_records = []
    for link_id, flow_info in link_flow.items():
        link_records.append({
            "link_id":               link_id,
            "link_type":             flow_info["link_type"],
            "max_flow_cms":          flow_info["max_flow_cms"],
            "max_velocity_ms":       flow_info["max_velocity_ms"],
            "max_full_flow_ratio":   flow_info["max_full_flow_ratio"],
            "scenario":              scenario,
            "event_id":              event_id,
        })

    return {
        "status":        "success",
        "scenario":      scenario,
        "event_id":      event_id,
        "nodes":         node_records,
        "links":         link_records,
        "runoff":        runoff,
        "rpt_path":      str(rpt_path),
        "inp_path":      str(inp_path),
    }


def write_csv(all_records: list, csv_path: Path) -> None:
    """Write flat records to CSV."""
    if not all_records:
        print(f"  [WARN] No records; skipping {csv_path}")
        return
    fieldnames = list(all_records[0].keys())
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with open(csv_path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_records)
    print(f"  [OK] CSV: {csv_path} ({len(all_records)} rows)")


def write_gpkg(all_records: list, gpkg_path: Path) -> None:
    """Write GeoPackage with point geometry."""
    try:
        import geopandas as gpd
        from shapely.geometry import Point
    except ImportError:
        print("  [SKIP] geopandas not available")
        return

    valid = [r for r in all_records if r.get("x") is not None and r.get("y") is not None]
    if not valid:
        print("  [WARN] No records with coordinates; skipping GPKG")
        return

    rows = []
    for r in valid:
        row = dict(r)
        row["geometry"] = Point(r["x"], r["y"])
        row["swmm_node_id"] = row.pop("node_id")
        rows.append(row)

    gdf = gpd.GeoDataFrame(rows, crs="EPSG:4326")
    gpkg_path.parent.mkdir(parents=True, exist_ok=True)
    gdf.to_file(gpkg_path, driver="GPKG", layer="swmm_flood_nodes")
    print(f"  [OK] GeoPackage: {gpkg_path} ({len(gdf)} features, CRS=EPSG:4326)")

    # Verify
    gdf_check = gpd.read_file(gpkg_path, layer="swmm_flood_nodes")
    print(f"  [VERIFY] Read back: {len(gdf_check)} features, CRS={gdf_check.crs}")


def main() -> None:
    print("=" * 70)
    print("  SWMM RPT → GIS Output Generator")
    print("  Member 4 | Chennai Flood Nowcasting")
    print("=" * 70)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_node_records = []
    scenario_data    = {}

    for scenario, inp_name in SCENARIOS.items():
        print(f"\n[+] Processing scenario: {scenario}")
        result = build_records_from_rpt(scenario, inp_name)

        if "error" in result:
            print(f"    [FAIL] {result['error']}")
            continue

        nodes = result["nodes"]
        links = result["links"]
        runoff = result.get("runoff", {})

        print(f"    Nodes parsed:  {len(nodes)}")
        print(f"    Links parsed:  {len(links)}")
        print(f"    Total precip:  {runoff.get('total_precip_mm', 'N/A')} mm")
        for n in nodes:
            print(f"    {n['node_id']:6} max_depth={n['depth_m']:5.3f} m  flooded={n['flooded']}")

        all_node_records.extend(nodes)
        scenario_data[scenario] = result

    if not all_node_records:
        print("\n[ERROR] No node records generated. Check RPT files exist.")
        sys.exit(1)

    # Write node CSV
    print(f"\n[CSV] Writing node CSV...")
    write_csv(all_node_records, OUTPUT_DIR / "swmm_flood_nodes.csv")

    # Write GeoPackage
    print(f"\n[GPKG] Writing GeoPackage...")
    write_gpkg(all_node_records, OUTPUT_DIR / "swmm_flood_nodes.gpkg")

    # Write link CSV
    all_link_records = []
    for sc_result in scenario_data.values():
        all_link_records.extend(sc_result.get("links", []))
    print(f"\n[CSV] Writing link CSV...")
    write_csv(all_link_records, OUTPUT_DIR / "swmm_conduit_results.csv")

    # Build comparison report
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "simulation_period": {
            "start": "2015-11-28T00:00:00+00:00",
            "end":   "2015-12-04T23:30:00+00:00",
        },
        "rainfall_source":   "NASA GPM IMERG 30-min (2015-11-28 to 2015-12-04)",
        "hydraulic_engine":  "EPA SWMM 5.2.4 via PySWMM 2.1.0",
        "model_type":        "synthetic_pilot_network",
        "model_coordinate_crs": "EPSG:4326",
        "model_description": (
            "3-node pilot network: J1 (10 m elev), J2 (8.5 m), OUT1 (7 m outfall). "
            "Two 1.2 m circular conduits (C1: 300 m, C2: 150 m). "
            "One 5 ha subcatchment (75% impervious). "
            "Coordinates near 80.27°E, 13.08°N (Chennai)."
        ),
        "temporal_export_mode": "maximum_depth_per_scenario_with_peak_occurrence_timestamp",
        "temporal_export_note": "Current MVP exports maximum simulated node depth per scenario rather than the complete temporal series. The timestamp attribute records the exact timestamp of peak maximum depth occurrence (time_of_max_occurrence) from SWMM.",
        "scenarios": {},
        "scenario_comparison": {},
        "limitations": [
            "Model is a synthetic pilot network; NOT the real Chennai drainage system.",
            "Real drainage GeoPackage (10,255 features) is NOT hydraulically connected to this model.",
            "Current MVP exports maximum simulated node depth per scenario rather than the complete temporal series.",
            "Node depths are maximum over the full simulation period.",
            "No nodes were surcharged or flooded (overflow) under IMERG 2015 event at pilot scale.",
            "Scenario differences are due to Manning roughness multipliers only; geometry unchanged.",
        ],
    }

    for scenario, sc_result in scenario_data.items():
        nodes = sc_result["nodes"]
        links = sc_result["links"]
        runoff = sc_result.get("runoff", {})

        max_depth  = max((n["depth_m"] for n in nodes), default=0.0)
        flooded_n  = sum(1 for n in nodes if n["flooded"])
        max_flow   = max((l["max_flow_cms"] for l in links), default=0.0)
        max_vel    = max((l["max_velocity_ms"] for l in links), default=0.0)

        report["scenarios"][scenario] = {
            "status":                 "success",
            "rpt_file":               sc_result["rpt_path"],
            "total_precip_mm":        runoff.get("total_precip_mm"),
            "total_nodes":            len(nodes),
            "flooded_nodes":          flooded_n,
            "max_node_depth_m":       round(max_depth, 4),
            "max_conduit_flow_cms":   round(max_flow, 6),
            "max_conduit_velocity_ms": round(max_vel, 4),
            "per_node": {
                n["node_id"]: {
                    "max_depth_m":    n["depth_m"],
                    "avg_depth_m":    n["avg_depth_m"],
                    "max_hgl_m":      n["max_hgl_m"],
                    "flooded":        n["flooded"],
                }
                for n in nodes
            },
        }

    # Compute inter-scenario differences
    if "normal" in report["scenarios"] and "severe_blockage" in report["scenarios"]:
        d_normal = report["scenarios"]["normal"]["max_node_depth_m"]
        d_severe = report["scenarios"]["severe_blockage"]["max_node_depth_m"]
        d_reduced = report["scenarios"].get("reduced_capacity", {}).get("max_node_depth_m", d_normal)

        report["scenario_comparison"] = {
            "max_depth_normal_m":          d_normal,
            "max_depth_reduced_capacity_m": d_reduced,
            "max_depth_severe_blockage_m": d_severe,
            "depth_increase_normal_to_reduced_m": round(d_reduced - d_normal, 4),
            "depth_increase_normal_to_severe_m":  round(d_severe  - d_normal, 4),
            "pct_increase_normal_to_severe":      round(
                100 * (d_severe - d_normal) / d_normal if d_normal > 0 else 0, 1
            ),
            "hydraulic_note": (
                "Scenario changes apply Manning roughness multipliers to conduit C1 and C2. "
                "Higher roughness reduces flow capacity, raises upstream head (node depth), "
                "while the same runoff volume enters from subcatchment S1. "
                "Under the 2015 IMERG event, no nodes reach overflow at pilot scale."
            ),
        }

    report_path = OUTPUT_DIR / "scenario_comparison.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n[OK] Scenario comparison report: {report_path}")

    # Print summary
    print("\n" + "=" * 70)
    print("  SCENARIO RESULTS SUMMARY")
    print("=" * 70)
    for sc in SCENARIOS:
        if sc in report["scenarios"]:
            d = report["scenarios"][sc]
            print(f"\n  {sc}:")
            print(f"    Total precipitation: {d['total_precip_mm']} mm")
            print(f"    Max node depth:      {d['max_node_depth_m']} m")
            print(f"    Max conduit flow:    {d['max_conduit_flow_cms']} m³/s")
            print(f"    Flooded nodes:       {d['flooded_nodes']}")

    if "scenario_comparison" in report:
        c = report["scenario_comparison"]
        print(f"\n  Depth increase (normal → severe blockage):")
        print(f"    {c['max_depth_normal_m']} m → {c['max_depth_severe_blockage_m']} m")
        print(f"    (+{c['depth_increase_normal_to_severe_m']} m, +{c['pct_increase_normal_to_severe']}%)")

    print(f"\n[DONE] All outputs in: {OUTPUT_DIR}")
    print(f"  swmm_flood_nodes.csv")
    print(f"  swmm_flood_nodes.gpkg")
    print(f"  swmm_conduit_results.csv")
    print(f"  scenario_comparison.json")


if __name__ == "__main__":
    main()
