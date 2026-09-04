# Member 4 GIS — SWMM + GIS/DEM Flood Mapping Integration
**Chennai Flood Nowcasting & Decision-Support System (SIH 2026)**
**Branch:** `module-3-nilesh`

---

## 1. Executive Summary & Status Overview

This module integrates EPA SWMM 5.2.4 hydraulic modeling outputs with spatial GIS/DEM datasets for Chennai.

| Category | Component | Status | Description |
|---|---|---|---|
| **Data** | NASA GPM IMERG 2015 Rainfall | **REAL** | 335 records (30-min intervals), Nov 28 – Dec 04 2015 |
| **Data** | Copernicus GLO-30 DEM | **REAL** | 30 m resolution, 2520×2160 pixels, EPSG:4326 |
| **Data** | Historical Flood Extents | **REAL** | 4,001 observed flood extent polygons from 2015 Chennai disaster |
| **Data** | Chennai Municipal SWD GIS | **REAL** | 10,255 stormwater drain line features from Greater Chennai Corp |
| **Data** | Road Centerlines | **MISSING** | No road centerline dataset exists in the repository |
| **Engine**| SWMM Hydraulic Modeling | **WORKING**| All 3 scenarios runnable, real IMERG rainfall injected |
| **Engine**| SWMM → GIS Layer Export | **WORKING**| GeoPackage & CSV outputs with peak occurrence timestamps |
| **GIS**   | Spatial Validation | **WORKING**| Distance metrics computed; explicitly notes pilot model limitation |
| **GIS**   | Road Impact Assessment | **PROTOTYPE PROXY**| **NOT actual road data**; uses drain geometries as structural proxy |
| **GIS**   | Continuous Flood Raster | **NOT CLAIMED**| Point-based flood nodes only; no 3-point raster interpolation |

---

## 2. Definitive Classification of Deliverables

### A. WHAT IS REAL
- **IMERG Rainfall**: Actual NASA GPM satellite precipitation data (`data/rainfall/chennai_imerg_2015.csv`) for the 2015 Chennai flood event.
- **Chennai DEM**: Real Copernicus GLO-30 Digital Surface Model (`Datasets/DEM/chennai_dem_glo30.tif`).
- **Chennai Historical Flood Extent**: Real observed flood polygons (`Datasets/Histoical Flood Events/chennai_flood_extent_2015.gpkg`) containing 4,001 features from the 2015 flood disaster.
- **Chennai Drainage GIS**: Real municipal stormwater drainage network (`data/processed/drainage/chennai_swd.gpkg`) with 10,255 features.

### B. WHAT IS WORKING
- **SWMM Rainfall Injection**: `swmm_engine/rainfall.py::inject_rainfall()` dynamically parses the IMERG CSV and writes a 335-entry `[TIMESERIES]` into the SWMM `.inp` file.
- **SWMM Scenarios**:
  - `normal` (Manning roughness multiplier 1.0×, n=0.013) → max node depth **0.28 m**
  - `reduced_capacity` (Manning roughness multiplier 1.6×, n=0.0208) → max node depth **0.36 m**
  - `severe_blockage` (Manning roughness multiplier 2.5×, n=0.0325) → max node depth **0.47 m**
  - Depth increase normal → severe blockage is **+0.19 m (+67.9%)**, demonstrating hydraulic head elevation and backwater flow resistance.
- **SWMM Result Extraction**: `generate_outputs_from_rpt.py` accurately extracts junction depths, conduit flows, runoff volumes, and peak timestamps.
- **SWMM → GIS GeoPackage**: Generates `member4_gis/outputs/swmm_flood_nodes/swmm_flood_nodes.gpkg` (EPSG:4326, 9 features across 3 scenarios).
- **DEM Metadata Inspection**: `dem_inspector.py` extracts raster bounds, pixel sizes, and computes separated land terrain vs. marine artifact statistics.
- **Historical Flood Processing**: `historical_flood_processor.py` converts raw spatial observations to clean GeoPackage format.
- **Spatial Validation**: `validation.py` re-projects to UTM 44N and computes nearest-neighbor distances between SWMM nodes and observed historical flood extents.

### C. WHAT IS MVP / PARTIAL
- **Point-Based Flood Representation**: Simulated flood nodes are represented as discrete points with maximum depth attributes. No continuous raster is generated.
- **Maximum Depth Export**: Current MVP exports maximum simulated node depth per scenario rather than the complete 336-step temporal series. The `timestamp` column records the exact timestamp of peak maximum depth occurrence (`time_of_max_occurrence`) from SWMM.
- **Backend Integration**: The application backend (`backend/app/`) consists strictly of compiled `.pyc` bytecode without source files. All integration is via clean file-based GIS contracts.
- **Road Impact Assessment**: **PROTOTYPE DRAINAGE-PROXY ONLY.** See Section 4 below.

### D. WHAT IS NOT CURRENTLY CLAIMED
- **NO Full Chennai Hydraulic Model**: The SWMM model is a 3-node pilot network covering a 5 ha subcatchment, not the entire municipal drainage network.
- **NO Hydraulic Connection between Drainage GIS and SWMM**: The 10,255 drainage features in `chennai_swd.gpkg` are not converted into a connected SWMM hydraulic graph.
- **NO City-Scale Continuous Flood Raster**: Interpolating a continuous inundation surface across 1,000 km² from 3 pilot points is hydraulically invalid and is strictly avoided.
- **NO Actual Road Flood Risk**: No road centerline dataset exists in the repository.
- **NO Real-Time or AI/ML Predictions**: All hydraulic results originate from physical dynamic-wave SWMM 5.2 simulations.

---

## 3. Verified Rainfall Dataset QA

| Property | Verified Value | Documentation / Notes |
|---|---|---|
| **File Path** | `data/rainfall/chennai_imerg_2015.csv` | Preprocessed from NASA GPM IMERG NetCDF4 |
| **Total Rows** | **335 data rows** | Plus 1 header row = 336 lines in file |
| **Unique Timestamps**| **335** | No duplicate timestamps |
| **First Timestamp** | `11/28/2015 00:00` | Start of simulation |
| **Last Timestamp** | `12/04/2015 23:30` | End of simulation |
| **Timestep Interval**| **30 minutes** | Nominal half-hourly satellite product |
| **Missing Timestep** | **12/01/2015 01:00** | 1 missing interval in GPM data (delta = 1 hr between row 145 & 146) |
| **Units** | **mm/hr (Intensity)** | Column name is `rainfall_mm`, but values are intensity rates in mm/hr |
| **Min / Max / Mean** | 0.00 / 24.74 / 2.30 mm/hr | Zero negative values |
| **Total Injected Precip** | **384.708 mm** | Verified in SWMM runoff continuity report; matches sum of (rate * 0.5 hr) = 384.88 mm within 0.04% |
| **Records into SWMM**| **335 `TS_RAIN` lines** | Verified in `direct_injected_*.inp` `[TIMESERIES]` section |

---

## 4. Road Flood Impact: Critical Disclaimer & Prototype Explanation

> **CRITICAL NOTICE ON ROAD IMPACT DATA:**
> **This is NOT actual road flood risk and must not be interpreted as road data.**
> No Chennai road network or road centerline dataset exists in the repository.

### Prototype Drainage-Proxy Method
1. **Source Geometry**: 500 sampled stormwater drainage channel segments from `data/processed/drainage/chennai_swd.gpkg`.
2. **Transfer Mechanism**: Inverse Distance Weighting (IDW, power=2, radius=5 km) from the 3 pilot SWMM nodes to drainage channel centroids.
3. **Purpose**: Used strictly as a structural spatial placeholder to validate the downstream schema, risk categorization (`safe`, `watch`, `likely`, `severe`), and routing-cost interface required by `docs/integration_contract.md`.
4. **Data Tagging**: Every record in `road_impact.csv` and `road_impact.gpkg` explicitly carries:
   - `infrastructure_type`: `"drainage_channel_proxy""
   - `data_type`: `"prototype_drainage_proxy""
   - `disclaimer`: `"This is NOT actual road flood risk and must not be interpreted as road data.""
   - `road_id`: `"drain-proxy-<DRAIN_ID>""

### Correct Eventual Road Integration Pipeline
When an actual Chennai road centerline dataset (e.g. OSM highways or municipal road GIS) is acquired:
```
REAL ROAD CENTERLINES + SWMM FLOOD INFORMATION
        ↓
SPATIAL INTERSECTION / PROXIMITY
        ↓
ROAD FLOOD DEPTH
        ↓
ROAD RISK / PASSABILITY CLASSIFICATION
        ↓
EXISTING ROUTING ENGINE
```

---

## 5. Copernicus GLO-30 DEM Quality Assurance

| Parameter | Value | Notes |
|---|---|---|
| **Source Path** | `Datasets/DEM/chennai_dem_glo30.tif` | 15 MB GeoTIFF |
| **CRS** | `EPSG:4326` (WGS84) | 1 arc-second (0.00027778°) |
| **Dimensions** | 2,520 columns × 2,160 rows | **5,443,200 total pixels** |
| **Pixel Resolution**| ≈ **30.92 m** | Consistent with Copernicus GLO-30 specifications |
| **Bounding Box** | 79.80°–80.50°E, 12.70°–13.30°N | Spans Greater Chennai and surrounding catchment |
| **NoData Tag** | `None` | GeoTIFF header does not declare an explicit nodata value |
| **Land Elevation (>= 0 m)**| **0.0 m to 313.62 m** | **Mean: 23.10 m, Median: 17.51 m, Std: 23.68 m** (5,442,358 pixels = 99.98% of raster) |
| **Hydro-flattened Ocean**| **0.0 m** | 1,713,353 pixels (31.48% of raster) over Bay of Bengal |
| **Negative Artifacts (< 0 m)**| **-65.55 m to -0.00 m** | **842 pixels (0.015% of raster)** |

### Explanation of Negative Elevation Values
The reported minimum elevation of -65.55 m is **not bathymetry**.
Copernicus GLO-30 is derived from radar interferometry (TanDEM-X). Over open water (the eastern 31% of the raster is the Bay of Bengal), radar beams experience specular reflection and phase decorrelation. While Copernicus applied a water body mask to hydro-flatten ocean to 0 m, 842 fringe pixels along the coastline and tidal estuaries contain residual radar noise and void-fill artifacts.
**Hydrological Recommendation**: Downstream 2D overland flow algorithms should clamp DEM elevations to >= 0.0 m (`np.clip(dem, 0.0, None)`) to prevent artificial sinks.

---

## 6. Spatial Validation: Observed vs. Simulated

| Parameter | Value | Context |
|---|---|---|
| **Observed Flood Features**| **4,001 unique polygons** | Extracted from `chennai_flood_extent_2015.gpkg` (2015 Chennai floods) |
| **Simulated Nodes** | 3 pilot nodes (`J1`, `J2`, `OUT1`) | Normal scenario (elevations 10.0, 8.5, 7.0 m) |
| **Sample Size** | 500 random historical centroids | Sampled across the 4,001 features |
| **Tolerance Distance** | 2,000 m (2 km) | Spatial proximity threshold |
| **Within 2 km** | **2.2%** (11 points) | Points within 2 km of pilot network |
| **Mean Nearest Distance** | **22.86 km** | Physical distance from city neighborhoods to pilot |
| **Min Distance** | **424.4 m** | Nearest observed flood polygon to pilot node J1 |
| **Max Distance** | **92.84 km** | Outermost regional flood polygon in extent dataset |

### Explicit Distinction: Model Limitation vs. Code Failure
- **Validation Code Status: 100% CORRECT.** The spatial nearest-neighbor search executes without error in projected UTM 44N coordinates.
- **Cause of Low Match Rate: MODEL SCALE LIMITATION.** The 3 pilot SWMM nodes represent a single 5-hectare local drainage catchment at 80.27°E, 13.08°N. The historical flood extent dataset covers the entire Chennai Metropolitan Area (over 1,000 km²). An average distance of 22.86 km is the expected physical geographic separation between other parts of Chennai and this pilot site. A high validation match rate requires a distributed, city-wide SWMM network.

---

## 7. SWMM → GIS Data Contract Specification

All simulation outputs are exported to `member4_gis/outputs/swmm_flood_nodes/`:

### `swmm_flood_nodes.gpkg` (Layer: `swmm_flood_nodes`, CRS: `EPSG:4326`)
- `swmm_node_id` (Text): Pilot junction identifier (`J1`, `J2`, `OUT1`)
- `x`, `y` (Float): Coordinates in decimal degrees WGS84
- `depth_m` (Float): Maximum hydraulic water depth over the simulation period (m)
- `avg_depth_m` (Float): Simulation-period average depth (m)
- `max_hgl_m` (Float): Maximum Hydraulic Grade Line elevation (m)
- `flooded` (Boolean): Overflow status (`False` for pilot scale under this event)
- `max_flooding_cms` (Float): Peak surface overflow discharge (m³/s)
- `node_type` (Text): `JUNCTION` or `OUTFALL`
- `scenario` (Text): `normal` | `reduced_capacity` | `severe_blockage`
- `timestamp` (ISO-8601): Exact occurrence timestamp of peak flood depth (`2015-12-01T14:00:00+00:00` for J1)
- `event_id` (Text): Scenario-event tag (e.g. `imerg-2015-11-28_normal`)
- `temporal_note` (Text): Explicit notice regarding maximum-depth MVP export
- `geometry` (Point): WGS84 Point geometry

---

## 8. Automated Test Suite

Run tests via:
```bash
PYTHONPATH=. backend/.venv/bin/python3 -m pytest member4_gis/tests/test_member4_gis.py -v
```

The test suite contains **24 automated tests** covering:
- Exact 335 rainfall record count and timestamp validity
- SWMM model configuration, node coordinates, and scenario roughness multipliers
- Output schema verification including mandatory `timestamp` field
- Road impact prototype disclaimer and proxy classification
- DEM metadata validity (2520×2160, EPSG:4326, land elevation stats)
- Historical flood dataset integrity (4,001 unique features)
- Hydraulic ordering (depth normal <= depth reduced <= depth severe)
