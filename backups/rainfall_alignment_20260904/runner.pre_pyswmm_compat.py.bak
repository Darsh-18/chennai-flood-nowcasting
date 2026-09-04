import json
import os
from typing import Dict, Any

from pyswmm import Simulation, Nodes, Links


def run_swmm_simulation(
    inp_path: str = "swmm_engine/models/pilot_network.inp",
    scenario_name: str = "normal",
    config_path: str = "swmm_engine/config/default_params.json",
) -> Dict[str, Any]:
    if not os.path.exists(inp_path):
        return {"status": "failed", "error": f"File not found: {inp_path}"}

    with open(config_path, "r") as f:
        config_data = json.load(f)

    roughness_multiplier = (
        config_data.get("scenarios", {})
        .get(scenario_name, {})
        .get("roughness_multiplier", 1.0)
    )

    try:
        with Simulation(inp_path) as sim:
            nodes = Nodes(sim)
            links = Links(sim)

            # Apply roughness multiplier to all links
            for link in links:
                link.roughness *= roughness_multiplier

            # Tracking dictionaries
            node_max_depth: Dict[str, float] = {}
            node_max_flooding: Dict[str, float] = {}
            conduit_max_flow: Dict[str, float] = {}

            for step in sim:
                for node in nodes:
                    nid = node.nodeid
                    node_max_depth[nid] = max(
                        node_max_depth.get(nid, 0.0), node.depth
                    )
                    node_max_flooding[nid] = max(
                        node_max_flooding.get(nid, 0.0), node.flooding
                    )

                for link in links:
                    lid = link.linkid
                    conduit_max_flow[lid] = max(
                        conduit_max_flow.get(lid, 0.0), link.flow
                    )

        # Build result lists
        node_results = []
        for nid in node_max_depth:
            node_results.append(
                {
                    "id": nid,
                    "max_depth_m": round(node_max_depth[nid], 4),
                    "max_flooding_cms": round(node_max_flooding[nid], 6),
                    "flooded": node_max_flooding[nid] > 0.0,
                }
            )

        conduit_results = []
        for lid in conduit_max_flow:
            conduit_results.append(
                {
                    "id": lid,
                    "max_flow_cms": round(conduit_max_flow[lid], 6),
                }
            )

        flooded_nodes = sum(1 for n in node_results if n["flooded"])
        maximum_depth = max(
            (n["max_depth_m"] for n in node_results), default=0.0
        )

        return {
            "status": "success",
            "metadata": {
                "engine": "SWMM 5 (pyswmm)",
                "scenario": scenario_name,
                "assumptions": config_data.get("assumptions", {}),
            },
            "summary": {
                "total_nodes": len(node_results),
                "flooded_nodes": flooded_nodes,
                "maximum_depth_m": maximum_depth,
            },
            "nodes": node_results,
            "conduits": conduit_results,
        }

    except Exception as e:
        return {
            "status": "failed",
            "error": "SWMM execution failure",
            "details": str(e),
        }
