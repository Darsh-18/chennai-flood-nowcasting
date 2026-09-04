"""
test_member4_gis.py
--------------------
Automated tests for the Member 4 SWMM+GIS pipeline.

Tests:
  1.  Rainfall CSV exists and has correct columns
  2.  Rainfall timestamp format (MM/DD/YYYY HH:MM)
  3.  Rainfall values non-negative
  4.  Rainfall units are mm/hr (IMERG INTENSITY)
  5.  SWMM base .inp exists and is valid
  6.  SWMM node coordinates readable from .inp
  7.  CRS is EPSG:4326 in pilot model coordinates
  8.  Normal simulation runs and succeeds
  9.  Reduced-capacity simulation runs and succeeds
  10. Severe-blockage simulation runs and succeeds
  11. Severe blockage depth >= normal depth (hydraulic sanity)
  12. Reduced capacity depth >= normal depth
  13. SWMM output extraction: node_id, depth_m, flooded fields present
  14. GeoPackage creation from SWMM results
  15. GeoPackage can be opened and has correct schema
  16. Drainage GeoPackage exists and has geometries
  17. Missing .inp raises appropriate error
  18. Missing rainfall CSV raises FileNotFoundError
  19. API schema validation
  20. Scenario comparison report structure

Usage:
    PYTHONPATH=. pytest member4_gis/tests/test_member4_gis.py -v
"""

import csv
import json
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List

import pytest

# ---------------------------------------------------------------------------
# Project root setup
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BASE_INP       = PROJECT_ROOT / "swmm_engine" / "models" / "pilot_network.inp"
RAINFALL_CSV   = PROJECT_ROOT / "data" / "rainfall" / "chennai_imerg_2015.csv"
CONFIG_PATH    = PROJECT_ROOT / "swmm_engine" / "config" / "default_params.json"
DRAINAGE_GPKG  = PROJECT_ROOT / "data" / "processed" / "drainage" / "chennai_swd.gpkg"
SWMM_GPKG      = PROJECT_ROOT / "member4_gis" / "outputs" / "swmm_flood_nodes" / "swmm_flood_nodes.gpkg"
OUTPUT_DIR     = PROJECT_ROOT / "member4_gis" / "outputs" / "swmm_flood_nodes"

SCENARIOS = ["normal", "reduced_capacity", "severe_blockage"]

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def runner():
    """Import runner after ensuring path is set."""
    from swmm_engine.runner import run_swmm_simulation, prepare_scenario_inp
    return run_swmm_simulation, prepare_scenario_inp


@pytest.fixture(scope="session")
def normal_result(runner):
    run_swmm_simulation, _ = runner
    result = run_swmm_simulation(
        inp_path=str(BASE_INP),
        scenario_name="normal",
    )
    return result


@pytest.fixture(scope="session")
def reduced_result(runner):
    run_swmm_simulation, _ = runner
    result = run_swmm_simulation(
        inp_path=str(BASE_INP),
        scenario_name="reduced_capacity",
    )
    return result


@pytest.fixture(scope="session")
def severe_result(runner):
    run_swmm_simulation, _ = runner
    result = run_swmm_simulation(
        inp_path=str(BASE_INP),
        scenario_name="severe_blockage",
    )
    return result


# ---------------------------------------------------------------------------
# Test 1: Rainfall CSV exists
# ---------------------------------------------------------------------------

def test_rainfall_csv_exists():
    """Rainfall CSV must exist at the expected path."""
    assert RAINFALL_CSV.exists(), (
        f"Rainfall CSV not found: {RAINFALL_CSV}. "
        "Run scripts/rainfall/convert_imerg_to_swmm.py to generate it."
    )


# ---------------------------------------------------------------------------
# Test 2: Rainfall CSV has correct columns
# ---------------------------------------------------------------------------

def test_rainfall_csv_columns():
    """Rainfall CSV must have 'timestamp' and 'rainfall_mm' columns."""
    assert RAINFALL_CSV.exists(), "Rainfall CSV missing (run test_rainfall_csv_exists first)"
    with open(RAINFALL_CSV, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        fieldnames = reader.fieldnames
    assert fieldnames is not None, "CSV has no headers"
    assert "timestamp" in fieldnames, f"'timestamp' column missing; found: {fieldnames}"
    assert "rainfall_mm" in fieldnames, f"'rainfall_mm' column missing; found: {fieldnames}"


# ---------------------------------------------------------------------------
# Test 3: Rainfall timestamp format
# ---------------------------------------------------------------------------

def test_rainfall_timestamp_format():
    """Every timestamp must parse as MM/DD/YYYY HH:MM."""
    assert RAINFALL_CSV.exists()
    bad_rows = []
    with open(RAINFALL_CSV, newline="", encoding="utf-8") as fh:
        for i, row in enumerate(csv.DictReader(fh), start=2):
            ts = row.get("timestamp", "").strip()
            try:
                datetime.strptime(ts, "%m/%d/%Y %H:%M")
            except ValueError:
                bad_rows.append((i, ts))
    assert not bad_rows, f"Bad timestamp format in {len(bad_rows)} rows: {bad_rows[:5]}"


# ---------------------------------------------------------------------------
# Test 4: Rainfall values non-negative
# ---------------------------------------------------------------------------

def test_rainfall_values_non_negative():
    """All rainfall_mm values must be >= 0."""
    assert RAINFALL_CSV.exists()
    bad = []
    with open(RAINFALL_CSV, newline="", encoding="utf-8") as fh:
        for i, row in enumerate(csv.DictReader(fh), start=2):
            try:
                val = float(row.get("rainfall_mm", "0"))
                if val < 0:
                    bad.append((i, val))
            except ValueError:
                bad.append((i, "non-numeric"))
    assert not bad, f"Negative/invalid rainfall values: {bad[:5]}"


# ---------------------------------------------------------------------------
# Test 5: Rainfall record count (sanity)
# ---------------------------------------------------------------------------

def test_rainfall_record_count():
    """IMERG 2015 event should have ~335 half-hourly records (2015-11-28 to 2015-12-04)."""
    assert RAINFALL_CSV.exists()
    with open(RAINFALL_CSV, newline="", encoding="utf-8") as fh:
        n = sum(1 for _ in csv.DictReader(fh))
    assert n >= 300, f"Expected ~335 records, got {n}; check IMERG conversion."


# ---------------------------------------------------------------------------
# Test 6: SWMM base .inp exists
# ---------------------------------------------------------------------------

def test_swmm_inp_exists():
    """Base SWMM .inp must exist."""
    assert BASE_INP.exists(), f"SWMM model not found: {BASE_INP}"


# ---------------------------------------------------------------------------
# Test 7: SWMM node coordinates readable
# ---------------------------------------------------------------------------

def test_swmm_node_coordinates():
    """Node coordinates must be parseable from the .inp [COORDINATES] section."""
    assert BASE_INP.exists()
    coords = {}
    in_coords = False
    with open(BASE_INP, encoding="utf-8") as fh:
        for line in fh:
            stripped = line.strip()
            if stripped.startswith("["):
                in_coords = stripped.upper() == "[COORDINATES]"
                continue
            if in_coords and stripped and not stripped.startswith(";"):
                parts = stripped.split()
                if len(parts) >= 3:
                    coords[parts[0]] = (float(parts[1]), float(parts[2]))
    assert len(coords) >= 2, f"Expected ≥2 coordinate entries, got {len(coords)}"
    # Verify geographic coordinate range (Chennai: ~80°E, 13°N)
    for nid, (x, y) in coords.items():
        assert 79.0 < x < 82.0, f"Node {nid}: longitude {x} out of expected Chennai range"
        assert 12.0 < y < 14.0, f"Node {nid}: latitude {y} out of expected Chennai range"


# ---------------------------------------------------------------------------
# Test 8: SWMM config valid
# ---------------------------------------------------------------------------

def test_swmm_config_scenarios():
    """Config must define all three scenarios with roughness_multiplier."""
    assert CONFIG_PATH.exists(), f"Config missing: {CONFIG_PATH}"
    with open(CONFIG_PATH) as f:
        config = json.load(f)
    scenarios = config.get("scenarios", {})
    for sc in SCENARIOS:
        assert sc in scenarios, f"Scenario '{sc}' missing from config"
        assert "roughness_multiplier" in scenarios[sc], (
            f"Scenario '{sc}' missing roughness_multiplier"
        )
    # Verify ordering: normal < reduced < severe
    n = scenarios["normal"]["roughness_multiplier"]
    r = scenarios["reduced_capacity"]["roughness_multiplier"]
    s = scenarios["severe_blockage"]["roughness_multiplier"]
    assert n <= r <= s, (
        f"Roughness multipliers should increase: normal={n} ≤ reduced={r} ≤ severe={s}"
    )


# ---------------------------------------------------------------------------
# Test 9–11: Simulations succeed
# ---------------------------------------------------------------------------

def test_normal_simulation_succeeds(normal_result):
    """Normal scenario simulation must return status='success'."""
    assert normal_result.get("status") == "success", (
        f"Normal simulation failed: {normal_result.get('error')} | {normal_result.get('details')}"
    )


def test_reduced_capacity_simulation_succeeds(reduced_result):
    """Reduced capacity simulation must return status='success'."""
    assert reduced_result.get("status") == "success", (
        f"Reduced capacity simulation failed: {reduced_result.get('error')}"
    )


def test_severe_blockage_simulation_succeeds(severe_result):
    """Severe blockage simulation must return status='success'."""
    assert severe_result.get("status") == "success", (
        f"Severe blockage simulation failed: {severe_result.get('error')}"
    )


# ---------------------------------------------------------------------------
# Test 12: Node results have required fields
# ---------------------------------------------------------------------------

def test_simulation_output_schema(normal_result):
    """Each node result must have id, max_depth_m, max_flooding_cms, flooded."""
    assert normal_result.get("status") == "success"
    nodes = normal_result.get("nodes", [])
    assert len(nodes) >= 1, "No nodes in result"
    required = {"id", "max_depth_m", "max_flooding_cms", "flooded"}
    for node in nodes:
        missing = required - set(node.keys())
        assert not missing, f"Node {node.get('id')} missing fields: {missing}"


# ---------------------------------------------------------------------------
# Test 13: Hydraulic ordering — severe >= reduced >= normal depth
# ---------------------------------------------------------------------------

def test_scenario_depth_ordering(normal_result, reduced_result, severe_result):
    """
    Max node depth must increase (or stay equal) with scenario severity.
    Higher roughness → more flow resistance → higher upstream depths.
    """
    assert normal_result.get("status") == "success"
    assert reduced_result.get("status") == "success"
    assert severe_result.get("status") == "success"

    d_normal   = normal_result["summary"]["maximum_depth_m"]
    d_reduced  = reduced_result["summary"]["maximum_depth_m"]
    d_severe   = severe_result["summary"]["maximum_depth_m"]

    assert d_reduced >= d_normal, (
        f"Reduced capacity depth ({d_reduced} m) should be >= normal ({d_normal} m). "
        "Check scenario roughness modifications."
    )
    assert d_severe >= d_reduced, (
        f"Severe blockage depth ({d_severe} m) should be >= reduced ({d_reduced} m)."
    )


# ---------------------------------------------------------------------------
# Test 14: Missing .inp raises status='failed'
# ---------------------------------------------------------------------------

def test_invalid_inp_returns_failed():
    """Simulation with a nonexistent .inp must return status='failed'."""
    from swmm_engine.runner import run_swmm_simulation
    result = run_swmm_simulation(
        inp_path="nonexistent_file.inp",
        scenario_name="normal",
    )
    assert result.get("status") == "failed", (
        f"Expected 'failed' for missing .inp, got '{result.get('status')}'"
    )


# ---------------------------------------------------------------------------
# Test 15: Rainfall injection
# ---------------------------------------------------------------------------

def test_rainfall_injection():
    """inject_rainfall must produce a valid .inp with the real IMERG timeseries."""
    if not RAINFALL_CSV.exists():
        pytest.skip("Rainfall CSV not available")
    if not BASE_INP.exists():
        pytest.skip("Base .inp not available")

    from swmm_engine.rainfall import inject_rainfall

    out_inp = OUTPUT_DIR.parent.parent / "member4_gis" / "data" / "test_injected.inp"
    out_inp.parent.mkdir(parents=True, exist_ok=True)

    try:
        inject_rainfall(
            csv_path=str(RAINFALL_CSV),
            base_inp_path=str(BASE_INP),
            target_inp_path=str(out_inp),
        )
    except Exception as e:
        pytest.fail(f"inject_rainfall raised: {e}")

    assert out_inp.exists(), "Injected .inp not created"

    # Verify [TIMESERIES] section was written
    content = out_inp.read_text(encoding="utf-8")
    assert "[TIMESERIES]" in content
    assert "TS_RAIN" in content


# ---------------------------------------------------------------------------
# Test 16: Missing rainfall CSV raises FileNotFoundError
# ---------------------------------------------------------------------------

def test_missing_rainfall_csv_raises():
    """inject_rainfall must raise FileNotFoundError for a missing CSV."""
    from swmm_engine.rainfall import inject_rainfall
    with pytest.raises(FileNotFoundError):
        inject_rainfall(
            csv_path="nonexistent_rainfall.csv",
            base_inp_path=str(BASE_INP),
            target_inp_path="ignored_output.inp",
        )


# ---------------------------------------------------------------------------
# Test 17: Drainage GeoPackage
# ---------------------------------------------------------------------------

def test_drainage_gpkg_exists():
    """Chennai drainage GeoPackage must exist."""
    assert DRAINAGE_GPKG.exists(), f"Drainage GPKG not found: {DRAINAGE_GPKG}"


@pytest.mark.skipif(
    not Path(
        str(PROJECT_ROOT / "data" / "processed" / "drainage" / "chennai_swd.gpkg")
    ).exists(),
    reason="Drainage GPKG not present"
)
def test_drainage_gpkg_has_geometries():
    """Drainage GPKG must have ≥1000 valid geometries."""
    try:
        import geopandas as gpd
    except ImportError:
        pytest.skip("geopandas not available")

    try:
        gdf = gpd.read_file(DRAINAGE_GPKG)
    except Exception:
        gdf = gpd.read_file(DRAINAGE_GPKG, layer="drains")

    assert len(gdf) >= 1000, f"Expected ≥1000 drain features, got {len(gdf)}"
    non_empty = gdf[gdf.geometry.notna() & ~gdf.geometry.is_empty]
    assert len(non_empty) >= 1000, f"Expected ≥1000 valid geometries, got {len(non_empty)}"


# ---------------------------------------------------------------------------
# Test 18: GeoPackage schema
# ---------------------------------------------------------------------------

@pytest.mark.skipif(
    not SWMM_GPKG.exists(),
    reason="swmm_flood_nodes.gpkg not yet generated; run swmm_to_gis.py"
)
def test_swmm_gpkg_schema():
    """SWMM flood nodes GeoPackage must have required columns."""
    try:
        import geopandas as gpd
    except ImportError:
        pytest.skip("geopandas not available")

    gdf = gpd.read_file(SWMM_GPKG, layer="swmm_flood_nodes")
    required_cols = {"swmm_node_id", "depth_m", "flooded", "scenario", "geometry"}
    missing = required_cols - set(gdf.columns)
    assert not missing, f"GeoPackage missing columns: {missing}"
    assert gdf.crs is not None, "GeoPackage has no CRS"
    assert gdf.crs.to_epsg() == 4326, f"Expected EPSG:4326, got {gdf.crs}"
    assert len(gdf) >= 9, f"Expected ≥9 records (3 nodes × 3 scenarios), got {len(gdf)}"


# ---------------------------------------------------------------------------
# Test 19: Coordinate handling — all pilot nodes in Chennai region
# ---------------------------------------------------------------------------

@pytest.mark.skipif(
    not SWMM_GPKG.exists(),
    reason="swmm_flood_nodes.gpkg not yet generated"
)
def test_swmm_gpkg_coordinates_in_chennai():
    """All GeoPackage points must be in the Chennai region."""
    try:
        import geopandas as gpd
    except ImportError:
        pytest.skip("geopandas not available")

    gdf = gpd.read_file(SWMM_GPKG, layer="swmm_flood_nodes")
    for _, row in gdf.iterrows():
        geom = row.geometry
        assert 79.0 < geom.x < 82.0, f"Longitude {geom.x} out of range for Chennai"
        assert 12.0 < geom.y < 14.0, f"Latitude {geom.y} out of range for Chennai"


# ---------------------------------------------------------------------------
# Test 20: Scenario comparison report
# ---------------------------------------------------------------------------

@pytest.mark.skipif(
    not (PROJECT_ROOT / "member4_gis" / "outputs" / "swmm_flood_nodes" / "scenario_comparison.json").exists(),
    reason="scenario_comparison.json not yet generated; run swmm_to_gis.py"
)
def test_scenario_comparison_report():
    """Scenario comparison report must have all three scenarios."""
    report_path = OUTPUT_DIR / "scenario_comparison.json"
    assert report_path.exists()
    with open(report_path) as f:
        report = json.load(f)
    for sc in SCENARIOS:
        assert sc in report.get("scenarios", {}), f"Missing scenario '{sc}' in report"
        sc_data = report["scenarios"][sc]
        assert "max_node_depth_m" in sc_data
        assert "max_conduit_flow_cms" in sc_data
        assert "status" in sc_data
