# Member 4 GIS — SWMM + GIS/DEM Flood Mapping Integration

## Purpose

This directory contains the Member 4 contribution to the Chennai Flood Nowcasting
& Decision-Support System (SIH 2026). It integrates EPA SWMM hydraulic simulation
outputs with GIS datasets to produce:

- SWMM flood node GeoPackages (all 3 scenarios)
- Scenario comparison reports
- Road flood impact layers
- Spatial validation reports
- DEM and historical flood processing metadata

---

## Data Sources

### Rainfall
- **Source**: NASA GPM IMERG 30-minute half-hourly precipitation
- **Event**: 2015-11-28 00:00 UTC → 2015-12-04 23:30 UTC (2015 Chennai flood event)
- **File**: `data/rainfall/chennai_imerg_2015.csv` (336 rows)
- **Column `rainfall_mm`**: IMERG precipitation rate in **mm/hr** (INTENSITY format), despite the column name
- **Generation**: `scripts/rainfall/convert_imerg_to_swmm.py` (reads `data/raw/rainfall/chennai_imerg_2015.nc`)

### SWMM Model
- **Type**: Synthetic 3-node pilot network (NOT the real Chennai drainage system)
- **File**: `swmm_engine/models/pilot_network.inp`
- **Nodes**: J1 (junction, elev 10 m), J2 (junction, elev 8.5 m), OUT1 (free outfall, elev 7 m)
- **Conduits**: C1 (J1→J2, 300 m, 1.2 m diameter), C2 (J2→OUT1, 150 m, 1.2 m diameter)
- **Subcatchment**: S1 — 5 ha, 75% impervious, Horton infiltration
- **Coordinates**: EPSG:4326 (geographic — longitude/latitude)
  - J1: 80.2707°E, 13.0827°N
  - J2: 80.2735°E, 13.0850°N
  - OUT1: 80.2760°E, 13.0872°N

### Chennai Stormwater Drainage GIS
- **File**: `data/processed/drainage/chennai_swd.gpkg`
- **Features**: 10,255 MultiLineString drainage geometries
- **CRS**: EPSG:4326
- **Attributes include**: DRAIN_ID, DRAIN_LEN, DRAIN_WID, DRAIN_DEP, INVERT_SP, INVERT_EP, STATUS, WARD, ZONE, ST_NAME, RD_GEO_ID
- **STATUS**: This dataset contains real Chennai stormwater drain geometries but is **NOT hydraulically connected to the SWMM pilot model**. They are separate systems.

### DEM
- **Expected**: `Datasets/DEM/chennai_dem_glo30.tif` (Copernicus GLO-30, ~30 m resolution)
- **Status**: ⚠️ FILE MISSING — not present in the local repository
- **See**: `member4_gis/data/dem/dem_metadata.json` for missing-file documentation

### Historical Flood Data
- **Expected**: `Datasets/Historical Flood Events/`
- **Status**: ⚠️ DIRECTORY MISSING — only `Datasets/IMERG_2015/` is present
- **See**: `member4_gis/data/historical_flood/historical_flood_metadata.json`

---

## Directory Structure

```
member4_gis/
├── README.md                           ← This file
├── scripts/
│   ├── generate_outputs_from_rpt.py    ← PRIMARY: RPT → CSV + GPKG + comparison JSON
│   ├── swmm_to_gis.py                  ← Alternative: runs SWMM live + produces GIS outputs
│   ├── dem_inspector.py                ← Inspects chennai_dem_glo30.tif
│   ├── historical_flood_processor.py   ← Converts historical flood data to GPKG
│   ├── road_impact.py                  ← Road/drain flood impact (IDW from SWMM nodes)
│   ├── validation.py                   ← SWMM vs historical spatial validation
│   └── run_member4_pipeline.sh         ← Shell script to run all scripts
├── tests/
│   └── test_member4_gis.py             ← Pytest test suite (21 tests)
├── data/
│   ├── dem/
│   │   └── dem_metadata.json           ← DEM status (MISSING)
│   └── historical_flood/
│       └── historical_flood_metadata.json  ← Historical data status (MISSING)
├── outputs/
│   ├── swmm_flood_nodes/
│   │   ├── swmm_flood_nodes.csv        ← 9 rows (3 nodes × 3 scenarios)
│   │   ├── swmm_flood_nodes.gpkg       ← GeoPackage, EPSG:4326, layer=swmm_flood_nodes
│   │   ├── swmm_conduit_results.csv    ← 6 rows (2 conduits × 3 scenarios)
│   │   └── scenario_comparison.json    ← Full comparison report
│   ├── flood_maps/                     ← (no raster flood map; points-only MVP)
│   └── road_impact/
│       ├── road_impact.csv             ← 1500 rows (500 drain segments × 3 scenarios)
│       ├── road_impact.gpkg            ← GeoPackage, EPSG:4326, layer=road_flood_impact
│       └── road_impact_metadata.json   ← Method documentation
└── validation/
    └── validation_report.json          ← Spatial validation report
```

---

## SWMM Scenarios

| Scenario | Manning n multiplier | Conduit n | Description |
|----------|---------------------|-----------|-------------|
| normal | 1.0× | 0.013 | Clean drainage, full capacity |
| reduced_capacity | 1.6× | 0.0208 | 40% blockage equivalent |
| severe_blockage | 2.5× | 0.0325 | 70% blockage, backwater effects |

### Simulation Results (IMERG 2015-11-28 to 2015-12-04)

| Node | normal depth | reduced_capacity depth | severe_blockage depth |
|------|-------------|----------------------|----------------------|
| J1 | 0.28 m | 0.36 m | **0.47 m** |
| J2 | 0.23 m | 0.29 m | **0.39 m** |
| OUT1 | 0.23 m | 0.29 m | 0.29 m |

**Depth increase (normal → severe blockage): +0.19 m (+67.9%)**

No nodes reached overflow (flooding) at pilot scale under this event.

---

## SWMM → GIS Process

1. **Source**: Existing `.rpt` output files (`swmm_engine/outputs/direct_injected_*.rpt`)
   - These were produced by running SWMM with real IMERG rainfall injected
2. **Coordinate extraction**: Node coordinates read from `[COORDINATES]` section of `.inp` files
3. **CRS**: EPSG:4326 (pilot model uses geographic coordinates lon/lat)
4. **Output format**: GeoPackage (GPKG) with `Point` geometry per node per scenario

### GeoPackage Schema

```
swmm_flood_nodes.gpkg  (layer: swmm_flood_nodes)
├── swmm_node_id    TEXT    — node identifier (J1, J2, OUT1)
├── x               REAL    — longitude (EPSG:4326)
├── y               REAL    — latitude (EPSG:4326)
├── depth_m         REAL    — maximum hydraulic depth over simulation period (m)
├── avg_depth_m     REAL    — average hydraulic depth (m)
├── max_hgl_m       REAL    — maximum hydraulic grade line elevation (m)
├── flooded         BOOL    — True if overflow occurred (all False for this event)
├── max_flooding_cms REAL   — peak flooding rate (m³/s)
├── node_type       TEXT    — JUNCTION or OUTFALL
├── scenario        TEXT    — normal | reduced_capacity | severe_blockage
├── event_id        TEXT    — e.g. imerg-2015-11-28_normal
├── simulation_start_at TEXT — ISO 8601
├── simulation_end_at   TEXT — ISO 8601
├── source          TEXT    — swmm_rpt_node_depth_summary
├── model_type      TEXT    — synthetic_pilot_network
├── crs             TEXT    — EPSG:4326
├── rainfall_source TEXT    — NASA GPM IMERG ...
├── inp_file        TEXT    — source .inp filename
├── rpt_file        TEXT    — source .rpt filename
└── geometry        GEOMETRY — Point (EPSG:4326)
```

---

## CRS Handling

- **Pilot SWMM model**: EPSG:4326 (longitude, latitude in decimal degrees)
- **All GIS outputs**: EPSG:4326
- **Distance/area computations** (road impact, validation): EPSG:32644 (UTM Zone 44N)
- **Note**: The SWMM `[COORDINATES]` section stores geographic coordinates for this model.
  This is valid for visualization but not for hydraulic accuracy — SWMM internally
  computes distances from conduit `Length` fields, not from coordinate differences.

---

## Flood Mapping Methodology

**MVP type**: Simulated flood nodes (points), not a continuous flood raster.

1. SWMM produces maximum node depth for each junction over the simulation period
2. Each node is a Point in EPSG:4326
3. `depth_m` = hydraulic node depth (pipe crown to water surface), NOT road surface water depth
4. No hydraulic flood raster is generated because:
   - The pilot network has only 3 nodes
   - DEM file is missing from the repository
   - Interpolating 3 points to a flood raster is not hydraulically defensible

A future enhancement would use a spatially distributed SWMM model with the real
drainage GeoPackage converted to SWMM format, plus the GLO-30 DEM for terrain-guided
flood spreading.

---

## Road Integration

**Method**: Inverse-Distance Weighting (IDW) from SWMM node depths to drain centroids.

- Source: 500 sampled features from `data/processed/drainage/chennai_swd.gpkg`
- SWMM node depths are spatially transferred to each drain centroid within 5 km
- `flood_depth_m` in road_impact output is an **approximation/proxy**, not measured inundation
- Risk classification: `safe` (<0.05m), `watch` (0.05–0.20m), `likely` (0.20–0.50m), `severe` (≥0.50m)
- **LIMITATION**: No dedicated road dataset; drain geometries used as road proxy

### Integration Contract Compatibility

The road impact output is compatible with `docs/integration_contract.md` Section C:
```
road_id, flood_depth_m, risk, routing_cost, blocked, scenario, event_id, geometry (EPSG:4326)
```

---

## Validation

**Status**: LIMITED — historical flood data not available in repository.

When historical flood data is added to `Datasets/Historical Flood Events/`, the
`validation.py` script will:
1. Load historical flood GeoPackages
2. Compute nearest-neighbour distances (SWMM nodes → historical points)
3. Report % within 2 km tolerance
4. Note all relevant limitations

**Expected result**: Very poor coverage metrics, because the SWMM pilot covers
only 5 ha near one location, while historical floods covered all of Chennai.

---

## How to Run

```bash
# From project root, activate backend venv:
cd /path/to/chennai-flood-nowcasting
source backend/.venv/bin/activate

# 1. Generate GIS outputs from existing .rpt files (fast, no SWMM rerun needed):
PYTHONPATH=. python3 member4_gis/scripts/generate_outputs_from_rpt.py

# 2. Or run SWMM live and generate GIS (slower, requires pyswmm):
PYTHONPATH=. python3 member4_gis/scripts/swmm_to_gis.py

# 3. DEM inspector (requires Datasets/DEM/chennai_dem_glo30.tif):
PYTHONPATH=. python3 member4_gis/scripts/dem_inspector.py

# 4. Historical flood processor (requires Datasets/Historical Flood Events/):
PYTHONPATH=. python3 member4_gis/scripts/historical_flood_processor.py

# 5. Road flood impact:
PYTHONPATH=. python3 member4_gis/scripts/road_impact.py

# 6. Spatial validation:
PYTHONPATH=. python3 member4_gis/scripts/validation.py

# 7. Run tests:
PYTHONPATH=. python3 -m pytest member4_gis/tests/test_member4_gis.py -v
```

---

## Limitations

1. **Synthetic pilot network**: SWMM model is a 3-node synthetic network, NOT calibrated
   to real Chennai drainage geometry.
2. **No GIS-SWMM hydraulic connection**: The 10,255-feature drainage GeoPackage is independent
   of the SWMM model. They have not been connected into a unified hydraulic network.
3. **DEM missing**: `Datasets/DEM/chennai_dem_glo30.tif` was not present in the repository.
   No DEM-based terrain analysis could be performed.
4. **Historical flood data missing**: No observed flood extent/point data was available.
   Validation is limited to documentation of the limitation.
5. **No road dataset**: No dedicated Chennai road network dataset is in the repository.
   Drain geometries were used as a proxy for the road impact layer.
6. **Flood map is points-only**: No continuous flood raster exists; only 3 simulated nodes.
7. **3-second simulation**: The 2015 IMERG event (384 mm total precipitation) did not cause
   flooding (overflow) at any node at the pilot scale. Conduits were operating at 11–28%
   of full capacity in the normal scenario.
8. **Rainfall column name**: `rainfall_mm` in the IMERG CSV is actually mm/hr (intensity),
   consistent with SWMM's INTENSITY rain gage format.

---

*Member 4 GIS implementation — SIH 2026 Chennai Flood Nowcasting*
