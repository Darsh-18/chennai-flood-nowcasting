"""
road_impact.py
---------------
Road flood impact assessment using SWMM flood node proximity.

Pipeline:
  1. Load SWMM simulated flood nodes (all scenarios)
  2. Load Chennai drainage GIS data as road proxy (no dedicated road dataset)
  3. Apply proximity-based flood depth assignment
  4. Classify road risk (safe / watch / likely / severe)
  5. Write road_impact.gpkg and road_impact.csv

DOCUMENTED METHOD:
  - No dedicated Chennai road dataset is present in the repository.
  - The drainage GeoPackage (chennai_swd.gpkg) contains stormwater drain
    geometries, NOT roads. It is used here ONLY to demonstrate the spatial
    pipeline structure.
  - Flood depth assignment uses inverse-distance weighting from SWMM nodes
    to drain centroids within a 5 km radius.
  - SWMM node depth is NOT road surface inundation depth — it is hydraulic
    node depth at the pipe outlet. The proximity transfer is an APPROXIMATION
    for demonstration purposes only.
  - Risk thresholds are documented below and are not calibrated.

Risk thresholds (from integration_contract.md vocabulary):
  safe:   depth_proxy < 0.05 m
  watch:  0.05 m ≤ depth_proxy < 0.20 m
  likely: 0.20 m ≤ depth_proxy < 0.50 m
  severe: depth_proxy ≥ 0.50 m

Usage:
    PYTHONPATH=. <venv>/bin/python3 member4_gis/scripts/road_impact.py
"""

import json
import sys
from pathlib import Path
from typing import Dict, List

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

SWMM_GPKG     = PROJECT_ROOT / "member4_gis" / "outputs" / "swmm_flood_nodes" / "swmm_flood_nodes.gpkg"
DRAINAGE_GPKG = PROJECT_ROOT / "data" / "processed" / "drainage" / "chennai_swd.gpkg"
OUTPUT_DIR    = PROJECT_ROOT / "member4_gis" / "outputs" / "road_impact"

PROXIMITY_RADIUS_M = 5000.0  # 5 km search radius for IDW

# Risk thresholds (documented)
RISK_THRESHOLDS = {
    "safe":   (0.0,  0.05),
    "watch":  (0.05, 0.20),
    "likely": (0.20, 0.50),
    "severe": (0.50, float("inf")),
}

try:
    import geopandas as gpd
    import pandas as pd
    HAS_GEOPANDAS = True
except ImportError:
    HAS_GEOPANDAS = False

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


def classify_risk(depth_m: float) -> str:
    for risk, (lo, hi) in RISK_THRESHOLDS.items():
        if lo <= depth_m < hi:
            return risk
    return "safe"


def idw_depth(
    target_x: float,
    target_y: float,
    nodes_xy: List,
    nodes_depth: List,
    radius_m: float = PROXIMITY_RADIUS_M,
    power: float = 2.0,
) -> float:
    """
    Inverse-distance weighted depth transfer from SWMM nodes to a target point.

    Parameters
    ----------
    target_x, target_y : float
        Target point coordinates (UTM metres)
    nodes_xy : list of (x, y)
        SWMM node coordinates (UTM metres)
    nodes_depth : list of float
        SWMM node depths (m)
    radius_m : float
        Maximum search radius
    power : float
        IDW power parameter

    Returns
    -------
    float
        Weighted depth estimate, or 0.0 if no nodes within radius
    """
    if not nodes_xy:
        return 0.0

    weighted_sum = 0.0
    weight_total = 0.0

    for (nx, ny), depth in zip(nodes_xy, nodes_depth):
        dist = ((target_x - nx)**2 + (target_y - ny)**2)**0.5
        if dist < 1e-6:
            return depth  # coincident point
        if dist <= radius_m:
            w = 1.0 / (dist ** power)
            weighted_sum += w * depth
            weight_total += w

    if weight_total == 0.0:
        return 0.0
    return weighted_sum / weight_total


def main() -> None:
    print("=" * 70)
    print("  Road Flood Impact Assessment")
    print("  Member 4 | Chennai Flood Nowcasting")
    print("=" * 70)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if not HAS_GEOPANDAS:
        print("[ERROR] geopandas not available; cannot run road impact assessment.")
        _write_metadata({"status": "FAILED", "error": "geopandas not available"})
        return

    # Check dependencies
    if not SWMM_GPKG.exists():
        msg = f"SWMM flood nodes not found: {SWMM_GPKG}. Run swmm_to_gis.py first."
        print(f"[BLOCKED] {msg}")
        _write_metadata({"status": "BLOCKED", "error": msg})
        return

    if not DRAINAGE_GPKG.exists():
        msg = f"Drainage GeoPackage not found: {DRAINAGE_GPKG}."
        print(f"[BLOCKED] {msg}")
        _write_metadata({"status": "BLOCKED", "error": msg})
        return

    print(f"\n[1] Loading SWMM flood nodes: {SWMM_GPKG}")
    swmm_gdf = gpd.read_file(SWMM_GPKG, layer="swmm_flood_nodes")
    print(f"    Loaded: {len(swmm_gdf)} rows, CRS={swmm_gdf.crs}")

    print(f"\n[2] Loading drainage network: {DRAINAGE_GPKG}")
    try:
        drain_gdf = gpd.read_file(DRAINAGE_GPKG)
    except Exception as e:
        print(f"    [WARN] Could not open default layer: {e}. Trying layer='drains'...")
        try:
            drain_gdf = gpd.read_file(DRAINAGE_GPKG, layer="drains")
        except Exception as e2:
            print(f"    [FAIL] {e2}")
            _write_metadata({"status": "FAILED", "error": str(e2)})
            return

    print(f"    Loaded: {len(drain_gdf)} drains, CRS={drain_gdf.crs}")
    print(f"    Columns: {list(drain_gdf.columns)[:12]}")

    # Project to UTM 44N for distance computation
    UTM_CRS = "EPSG:32644"
    swmm_utm = swmm_gdf.to_crs(UTM_CRS)
    drain_utm = drain_gdf.to_crs(UTM_CRS)

    # Process each scenario
    all_impact_records = []

    for scenario in swmm_gdf["scenario"].unique():
        print(f"\n[3] Processing scenario: {scenario}")
        swmm_sc = swmm_utm[swmm_utm["scenario"] == scenario].copy()

        # Collect node coordinates and depths
        node_col = "swmm_node_id" if "swmm_node_id" in swmm_sc.columns else "node_id"
        nodes_xy = [(row.geometry.x, row.geometry.y) for _, row in swmm_sc.iterrows()]
        nodes_depth = [row["depth_m"] for _, row in swmm_sc.iterrows()]
        event_id = swmm_sc["event_id"].iloc[0] if "event_id" in swmm_sc.columns else f"imerg-2015-11-28_{scenario}"

        # Sample drain features (limit for efficiency — 10,255 drains is large)
        DRAIN_SAMPLE = 500
        if len(drain_utm) > DRAIN_SAMPLE:
            drain_sample = drain_utm.sample(DRAIN_SAMPLE, random_state=42)
            print(f"    Sampling {DRAIN_SAMPLE} of {len(drain_utm)} drains for computation efficiency.")
        else:
            drain_sample = drain_utm

        # Compute centroids
        drain_sample = drain_sample.copy()
        drain_sample["centroid"] = drain_sample.geometry.centroid

        # For each drain segment, compute IDW flood depth from SWMM nodes
        records = []
        for idx, row in drain_sample.iterrows():
            cx = row["centroid"].x
            cy = row["centroid"].y
            depth_proxy = idw_depth(cx, cy, nodes_xy, nodes_depth)
            risk = classify_risk(depth_proxy)

            # Build road_id from available attributes
            drain_id = row.get("DRAIN_ID", row.get("drain_id", str(idx)))
            road_geo_id = row.get("RD_GEO_ID", row.get("rd_geo_id", None))
            road_id = f"drain-{drain_id}" if road_geo_id is None else f"road-{road_geo_id}"

            records.append({
                "road_id":          road_id,
                "drain_id":         str(drain_id),
                "scenario":         scenario,
                "event_id":         event_id,
                "flood_depth_m":    round(depth_proxy, 4),
                "risk":             risk,
                "blocked":          risk == "severe",
                "assessment_method": "idw_from_swmm_nodes",
                "routing_cost":     _routing_cost(depth_proxy),
                "crs":              "EPSG:4326",
                "geometry":         row.geometry,
                "model_type":       "synthetic_pilot_network",
                "note": (
                    "flood_depth_m is an IDW proxy from SWMM node depths, "
                    "NOT measured road inundation depth."
                ),
            })

        all_impact_records.extend(records)
        print(f"    Processed {len(records)} drain segments.")

    if not all_impact_records:
        print("[WARN] No impact records generated.")
        _write_metadata({"status": "NO_DATA"})
        return

    # Build GeoDataFrame
    impact_gdf = gpd.GeoDataFrame(all_impact_records, crs=UTM_CRS)
    impact_gdf = impact_gdf.to_crs("EPSG:4326")  # Return to geographic

    # Drop helper columns
    non_geo_cols = [c for c in impact_gdf.columns if c != "geometry"]

    # Write GeoPackage
    gpkg_path = OUTPUT_DIR / "road_impact.gpkg"
    impact_gdf.to_file(gpkg_path, driver="GPKG", layer="road_flood_impact")
    print(f"\n[OK] Road impact GeoPackage: {gpkg_path}")

    # Write CSV (without geometry)
    csv_df = impact_gdf[non_geo_cols].copy()
    csv_path = OUTPUT_DIR / "road_impact.csv"
    csv_df.to_csv(csv_path, index=False)
    print(f"[OK] Road impact CSV: {csv_path}")

    # Summary by scenario
    for scenario in impact_gdf["scenario"].unique():
        sc_df = impact_gdf[impact_gdf["scenario"] == scenario]
        risk_counts = sc_df["risk"].value_counts().to_dict()
        print(f"\n  Scenario: {scenario}")
        print(f"    Total segments: {len(sc_df)}")
        print(f"    Risk breakdown: {risk_counts}")
        print(f"    Blocked:        {sc_df['blocked'].sum()}")

    # Write metadata
    _write_metadata({
        "status": "OK",
        "method": "inverse_distance_weighting_from_swmm_nodes",
        "proximity_radius_m": PROXIMITY_RADIUS_M,
        "drain_sample_size": min(DRAIN_SAMPLE, len(drain_gdf)),
        "drain_total_available": len(drain_gdf),
        "scenarios": list(impact_gdf["scenario"].unique()),
        "risk_thresholds": {k: list(v) for k, v in RISK_THRESHOLDS.items()},
        "routing_integration": {
            "compatible_with": "integration_contract.md Section C",
            "fields": ["road_id", "flood_depth_m", "risk", "routing_cost", "blocked", "scenario", "event_id"],
            "crs": "EPSG:4326",
        },
        "limitations": [
            "No road dataset in repository; drain centroids used as road proxies.",
            "IDW from 3 pilot nodes covering a 5 ha catchment to 10,255 drains is "
            "not hydraulically meaningful at city scale.",
            "flood_depth_m is a proximity-weighted proxy, NOT measured road inundation.",
            "Risk classification thresholds are not calibrated to Chennai conditions.",
        ],
    })

    print("\n[DONE] Road impact assessment complete.")


def _routing_cost(depth_m: float) -> float:
    """
    Compute routing cost penalty from flood depth proxy.
    Penalty is additive, not multiplicative.
    Higher depth = higher cost. 0.0 = no penalty.
    """
    if depth_m < 0.05:
        return 1.0   # nominal base cost
    elif depth_m < 0.20:
        return 2.0
    elif depth_m < 0.50:
        return 5.0
    else:
        return 100.0  # effectively blocked


def _write_metadata(data: Dict) -> None:
    meta_path = OUTPUT_DIR / "road_impact_metadata.json"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(meta_path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"[INFO] Metadata written: {meta_path}")


if __name__ == "__main__":
    main()
