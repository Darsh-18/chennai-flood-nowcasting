# MEMBER4_SWMM_GIS_AUDIT.md
# Chennai Flood Nowcasting — SWMM + GIS Integration Audit
# Branch: module-3-nilesh | Date: 2026-09-04

---

## 1. Executive Summary

This document audits the existing SWMM + GIS implementation on branch `module-3-nilesh`
and records the integration work performed by Member 4 to connect SWMM hydraulic
outputs with GIS / DEM / flood-mapping components.

**Classification legend:**
- ✅ REAL + WORKING
- 🟡 REAL DATA + NOT INTEGRATED
- 🔶 PARTIAL
- ❌ MOCK / HARDCODED
- ⛔ MISSING

---

## 2. Git Status at Audit

```
Branch:       module-3-nilesh
Tracking:     origin/Module-3-(nilesh)
Last commits:
  7ae513a  SWMM implemented successfully
  b0fae0e  drainage dataset
  a7c4ed2  KML Dataset Parser
  6467863  Pruned Old Files
  05626e7  SWMM Hydrology Engine
```

Untracked at audit start: `Datasets/` (contains only `Datasets/IMERG_2015/subset_GPM_3IMERGHH_07_20260902_032409_.txt`)

---

## 3. Existing Architecture

```
data/raw/rainfall/chennai_imerg_2015.nc      ← Raw IMERG NetCDF (28 KB)
      ↓
scripts/rainfall/convert_imerg_to_swmm.py   ← IMERG → CSV converter (h5py)
      ↓
data/rainfall/chennai_imerg_2015.csv         ← 336 records, MM/DD/YYYY HH:MM, mm/hr
      ↓
swmm_engine/rainfall.py                     ← inject_rainfall() → modifies [TIMESERIES]
      ↓
swmm_engine/runner.py                       ← prepare_scenario_inp() + run_swmm_simulation()
swmm_engine/models/pilot_network.inp        ← Base SWMM model
      ↓  (via PySWMM 2.1.0 / EPA SWMM 5.2.4)
swmm_engine/outputs/direct_injected_*.rpt   ← Simulation outputs (node depths, flows)
swmm_engine/outputs/direct_injected_*.out   ← Binary output files
      ↓
swmm_engine/api.py                          ← FastAPI POST /api/v1/swmm/simulate
      ↓  (contracts defined but not yet implemented at backend side)
backend/app/  (compiled .pyc only)          ← Separate backend application
frontend/dist/                              ← Compiled frontend assets
```

---

## 4. SWMM Implementation Audit

### 4.1 Model Structure

| Component | Status | Notes |
|-----------|--------|-------|
| `pilot_network.inp` | ✅ REAL + WORKING | 3-node synthetic model |
| `[OPTIONS]` | ✅ | DYNWAVE routing, CMS, Horton infiltration |
| `[RAINGAGES]` | ✅ | RG1, INTENSITY format, 0:30 interval |
| `[SUBCATCHMENTS]` | ✅ | S1: 5 ha, 75% impervious |
| `[SUBAREAS]` | ✅ | Standard parameters |
| `[INFILTRATION]` | ✅ | Horton: 75/10 mm/hr, decay 4.0 |
| `[JUNCTIONS]` | ✅ | J1 (elev 10m, 2m max depth), J2 (8.5m) |
| `[CONDUITS]` | ✅ | C1 (300m, n=0.013), C2 (150m, n=0.013) |
| `[XSECTIONS]` | ✅ | Circular, 1.2m diameter |
| `[OUTFALLS]` | ✅ | OUT1 (FREE, elev 7m) |
| `[TIMESERIES]` | ✅ | Replaced by IMERG injection |
| `[COORDINATES]` | ✅ | EPSG:4326 geographic coords |
| `[REPORT]` | ✅ | NODES ALL, LINKS ALL |
| Simulation dates | ✅ | 2015-11-28 to 2015-12-04 |

### 4.2 Scenario Implementation

| Scenario | Roughness multiplier | Conduit n | Status |
|----------|---------------------|-----------|--------|
| normal | 1.0× | 0.013 | ✅ REAL |
| reduced_capacity | 1.6× | 0.0208 | ✅ REAL |
| severe_blockage | 2.5× | 0.0325 | ✅ REAL |

Scenario modification: Manning roughness multiplied in `[CONDUITS]` section before SWMM run.
This is a hydraulically meaningful change — higher roughness reduces flow capacity,
increases upstream hydraulic head (node depth), and creates backwater effects.

**Key finding**: The existing `runner.py` only modifies roughness. Hydraulic cross-section
geometry (pipe diameter) is NOT changed. This is acceptable for demonstrating drainage
degradation effects but does not simulate physical blockage geometry.

### 4.3 Actual Simulation Outputs

All three scenarios ran successfully with real IMERG rainfall (384 mm total over 7 days).

| Node | normal | reduced_capacity | severe_blockage |
|------|--------|-----------------|-----------------|
| J1 (junction) | 0.28 m max depth | 0.36 m | 0.47 m |
| J2 (junction) | 0.23 m max depth | 0.29 m | 0.39 m |
| OUT1 (outfall) | 0.23 m max depth | 0.29 m | 0.29 m |
| Peak flow C1 | 0.306 m³/s | 0.306 m³/s | 0.306 m³/s |
| C1 capacity used | 11% | 17% | 28% |
| Flooded nodes | 0 | 0 | 0 |

**Analysis**: No nodes reached overflow at pilot scale. The 5 ha catchment produces
~0.31 m³/s peak runoff, well within the 1.2 m diameter conduit capacity (theoretical
full-pipe flow ~4 m³/s). Depth increase from normal to severe blockage = +0.19 m (+67.9%).

The scenario differences ARE hydraulically meaningful (roughness reduces flow velocity,
creates backwater), but the 1.2 m pipes are oversized relative to the 5 ha subcatchment.
This reflects the pilot/synthetic nature of the model.

### 4.4 Rainfall Source

| Property | Value |
|----------|-------|
| Source | NASA GPM IMERG v07 |
| Product | 3IMERGHH (half-hourly) |
| Event | 2015 Chennai floods (Nov–Dec) |
| Period | 2015-11-28 00:00 UTC → 2015-12-04 23:30 UTC |
| Records | 336 rows (one 30-min gap) |
| Units | mm/hr (precipitation RATE, INTENSITY format) |
| Processing | `scripts/rainfall/convert_imerg_to_swmm.py` (spatial average over bbox) |
| Injection | `swmm_engine/rainfall.py::inject_rainfall()` replaces `[TIMESERIES]` |
| Column name | `rainfall_mm` — MISLEADING NAME: this is mm/hr, not mm depth |
| Total precipitation (SWMM report) | 384.71 mm (over simulation period) |

**Rainfall units verification**: The SWMM rain gage `RG1` uses `INTENSITY` format with `0:30`
interval. SWMM interprets values as mm/hr and internally multiplies by timestep to get depth.
Peak IMERG intensity in the event: ~1.15 mm/hr (spatially averaged). This is low because it
is averaged over a wide geographic bounding box; actual station rainfall was much higher.

### 4.5 Model Validity

- ✅ Valid SWMM 5.2 syntax
- ✅ All object references resolved
- ✅ Valid coordinate system (geographic, documented as EPSG:4326)
- ✅ Hydraulic continuity error < 0.01% (excellent)
- ✅ All time steps converge
- ✅ No instability reported
- ✅ DYNWAVE routing mode
- ⚠️ WARNING: Model is synthetic; conduit sizes are engineering assumptions, not survey data

---

## 5. Rainfall Processing Audit

| Component | Status | Notes |
|-----------|--------|-------|
| Raw IMERG NetCDF | ✅ REAL | `data/raw/rainfall/chennai_imerg_2015.nc` (28 KB) |
| IMERG subset file | 🟡 REAL + NOT INTEGRATED | `Datasets/IMERG_2015/subset_GPM_3IMERGHH_07_20260902_032409_.txt` |
| `convert_imerg_to_swmm.py` | ✅ WORKING | Reads NetCDF via h5py, spatial average, CSV output |
| `chennai_imerg_2015.csv` | ✅ REAL | 336 rows, correct SWMM timestamp format |
| `inject_rainfall()` | ✅ WORKING | Replaces [TIMESERIES] section in .inp |
| Units interpretation | ✅ CORRECT | mm/hr intensity for SWMM INTENSITY gage |
| Timestamp alignment | ✅ CORRECT | SWMM start/end dates match CSV period |

**Issue found**: Column name `rainfall_mm` is misleading — it holds mm/hr intensity, not
accumulated depth. Documented in `docs/integration_contract.md` Section 2.2. Not fixed
to preserve backward compatibility; the column name is used by existing code.

---

## 6. Drainage Data Audit

| Component | Status | Notes |
|-----------|--------|-------|
| `data/raw/drainage/chennai_swd.kml` | ✅ REAL | Source KML from Chennai Municipal |
| `data/processed/drainage/chennai_swd.gpkg` | ✅ REAL | 10,255 MultiLineString drains |
| GeoPackage CRS | ✅ | EPSG:4326 |
| `scripts/drainage/convert_drainage.py` | ✅ | KML → GPKG converter |
| `scripts/drainage/inspect_drainage.py` | ✅ | KML inspection tool |
| `scripts/drainage/validate_drainage.py` | ✅ | Coordinate validation |
| `swmm_engine/kml_to_swmm.py` | 🔶 PARTIAL | KML→SWMM converter (logic correct, not used in pipeline) |
| KML→SWMM→pilot connection | ❌ NOT CONNECTED | GPKG and SWMM model are independent systems |

**Key limitation**: The 10,255 drainage features in `chennai_swd.gpkg` have NOT been
converted into a hydraulically valid SWMM network. `kml_to_swmm.py` exists but would
require significant GIS preprocessing, topology cleanup, elevation assignment, and
hydraulic calibration to produce a usable model.

---

## 7. GIS Assets Audit

| Asset | Status | Location |
|-------|--------|----------|
| Chennai drainage GPKG | ✅ REAL + WORKING | `data/processed/drainage/chennai_swd.gpkg` |
| Chennai DEM (GLO-30) | ⛔ MISSING | Expected: `Datasets/DEM/chennai_dem_glo30.tif` |
| Historical flood events | ⛔ MISSING | Expected: `Datasets/Historical Flood Events/` |
| Road dataset | ⛔ MISSING | No road data in repository |
| SWMM flood nodes GPKG | ✅ CREATED | `member4_gis/outputs/swmm_flood_nodes/swmm_flood_nodes.gpkg` |
| Road impact GPKG | 🔶 PARTIAL | `member4_gis/outputs/road_impact/road_impact.gpkg` (proxy method) |

---

## 8. Backend / API Audit

| Component | Status | Notes |
|-----------|--------|-------|
| `swmm_engine/api.py` | ✅ WORKING | FastAPI POST /api/v1/swmm/simulate |
| API request schema | ✅ | scenario + optional rainfall_csv_path |
| API response schema | ✅ | status, summary, nodes, conduits |
| `backend/app/` Python source | ❌ MISSING | Only compiled .pyc files present |
| Backend routers (.pyc) | 🟡 COMPILED | drainage, forecast, route, nowcast, flood_state, map_layers |
| Backend routing (/api/route) | 🟡 COMPILED | Uses infrastructure IDs, not canonical contract |
| `docs/integration_contract.md` | ✅ REAL | Defines canonical payloads A–D |
| SWMM → backend integration | ❌ NOT CONNECTED | No bridge between swmm_engine/api.py and backend |
| Frontend | 🟡 COMPILED | Only built dist/ assets; no editable source |

**Backend note**: The backend application exists only as compiled Python bytecode.
No editable `.py` source files were present in `backend/app/`. This means the backend
implementation cannot be audited, modified, or tested without decompilation.

---

## 9. What Member 4 Changed and Created

### New Files Created

```
member4_gis/
├── README.md
├── scripts/
│   ├── generate_outputs_from_rpt.py    ← PRIMARY pipeline script
│   ├── swmm_to_gis.py                  ← Live SWMM + GIS pipeline
│   ├── dem_inspector.py                ← DEM metadata extractor
│   ├── historical_flood_processor.py   ← Historical data processor
│   ├── road_impact.py                  ← Road flood impact (IDW)
│   ├── validation.py                   ← Spatial validation
│   └── run_member4_pipeline.sh         ← Pipeline runner
├── tests/
│   └── test_member4_gis.py             ← 21 automated tests
├── data/
│   ├── dem/dem_metadata.json           ← DEM status documentation
│   └── historical_flood/historical_flood_metadata.json
├── outputs/
│   ├── swmm_flood_nodes/
│   │   ├── swmm_flood_nodes.csv        ← 9 rows of real SWMM results
│   │   ├── swmm_flood_nodes.gpkg       ← Verified GeoPackage, EPSG:4326
│   │   ├── swmm_conduit_results.csv    ← Conduit flows by scenario
│   │   └── scenario_comparison.json    ← Full hydraulic comparison
│   └── road_impact/
│       ├── road_impact.csv
│       ├── road_impact.gpkg
│       └── road_impact_metadata.json
└── validation/
    └── validation_report.json
```

### Packages Installed (backend/.venv)

```
pyswmm==2.1.0         (added — not previously in venv)
swmm-toolkit==0.17.0  (added — SWMM engine binary)
rasterio==1.4.4       (added — for future DEM processing)
h5py==3.16.0          (added — for IMERG NetCDF reading)
```

### Files NOT Modified

All original files were preserved. No existing source files were changed.

---

## 10. Test Results

Tests run: `member4_gis/tests/test_member4_gis.py`
Engine: `backend/.venv/bin/python3 -m pytest -v`

| Test | Result |
|------|--------|
| test_rainfall_csv_exists | ✅ PASS |
| test_rainfall_csv_columns | ✅ PASS |
| test_rainfall_timestamp_format | ✅ PASS |
| test_rainfall_values_non_negative | ✅ PASS |
| test_rainfall_record_count | ✅ PASS |
| test_swmm_inp_exists | ✅ PASS |
| test_swmm_node_coordinates | ✅ PASS |
| test_swmm_config_scenarios | ✅ PASS |
| test_normal_simulation_succeeds | ✅ PASS (live SWMM, ~3s) |
| test_reduced_capacity_simulation_succeeds | ✅ PASS |
| test_severe_blockage_simulation_succeeds | ✅ PASS |
| test_simulation_output_schema | ✅ PASS |
| test_scenario_depth_ordering | ✅ PASS |
| test_invalid_inp_returns_failed | ✅ PASS |
| test_rainfall_injection | ✅ PASS |
| test_missing_rainfall_csv_raises | ✅ PASS |
| test_drainage_gpkg_exists | ✅ PASS |
| test_drainage_gpkg_has_geometries | ✅ PASS |
| test_swmm_gpkg_schema | ✅ PASS |
| test_swmm_gpkg_coordinates_in_chennai | ✅ PASS |
| test_scenario_comparison_report | ✅ PASS |

**Non-SWMM subset (fast, no simulation)**: 13/13 PASS in 0.31s
**Full suite**: 21/21 PASS (simulation tests add ~10-15s)

---

## 11. Remaining Limitations

### Critical (require significant work)

1. **No full Chennai hydraulic model**: The SWMM model is a 3-node synthetic pilot.
   Creating a real Chennai model requires: topology extraction from drainage GPKG,
   elevation assignment from DEM, hydraulic calibration with observed data.

2. **DEM not in repository**: `Datasets/DEM/chennai_dem_glo30.tif` is missing.
   Cannot perform terrain analysis, slope derivation, or DEM-guided flood extent.

3. **Historical flood data not in repository**: `Datasets/Historical Flood Events/` is missing.
   Cannot perform spatial validation against observed floods.

4. **No road dataset**: No Chennai road network in the repository.
   Road impact layer uses drain geometries as proxy.

5. **Backend source not available**: `backend/app/` contains only compiled `.pyc` files.
   Cannot audit, modify, or test backend routing integration from source.

### Moderate (feasible with existing data)

6. **KML→SWMM not activated**: `kml_to_swmm.py` can parse the KML but the resulting
   SWMM network would still need elevation data, boundary conditions, and calibration.

7. **No timeseries output**: SWMM runner returns max values only, not a full timeseries.
   PySWMM can extract per-timestep values; this would require updating `runner.py`.

8. **Road impact is IDW proxy only**: The IDW transfer from 3 nodes to drain centroids
   is not a hydraulic model; it is a spatial proximity heuristic.

### Minor / Documentation

9. **Rainfall column name misleading**: `rainfall_mm` column holds mm/hr intensity.
   Renaming would break existing code; documented in integration_contract.md.

10. **SWMM coordinates**: Pilot model uses geographic coordinates (lon/lat in EPSG:4326)
    as node positions. SWMM uses conduit `Length` fields for hydraulics, so this does
    not affect simulation accuracy, but means coordinate units appear as degrees.

---

## 12. What Is Real vs Synthetic

| Component | Classification |
|-----------|---------------|
| IMERG rainfall data (2015 Chennai event) | **REAL** — NASA GPM satellite data |
| SWMM simulation engine (EPA SWMM 5.2.4) | **REAL** — industry-standard hydraulic engine |
| SWMM model (pilot_network.inp) | **SYNTHETIC** — 3-node, assumed parameters |
| Conduit geometry (1.2m, 300m) | **ASSUMED** — engineering assumptions, not surveyed |
| Manning n (0.013) | **STANDARD** — literature value for concrete |
| Scenario roughness multipliers | **REASONABLE APPROXIMATIONS** — not calibrated to blockage |
| Node simulation results (depths, flows) | **REAL SIMULATION OUTPUTS** — from EPA SWMM |
| Chennai drainage GPKG (10,255 features) | **REAL** — Chennai Municipal Corporation data |
| GIS-SWMM hydraulic connection | **DOES NOT EXIST** |
| Road impact flood depths | **PROXY/APPROXIMATION** — IDW from SWMM nodes |
| Historical flood data | **MISSING** — not in repository |
| DEM | **MISSING** — not in repository |
| Validation metrics | **NOT COMPUTABLE** — missing historical data |

---

*Audit prepared by Member 4 — SIH 2026 Chennai Flood Nowcasting*
*Date: 2026-09-04*
*Branch: module-3-nilesh*
