# MEMBER4_SWMM_GIS_AUDIT.md
# Chennai Flood Nowcasting — SWMM + GIS Integration Audit
# Branch: module-3-nilesh | Date: 2026-09-04

---

## 1. Executive Summary

This document audits the SWMM + GIS implementation on branch `module-3-nilesh`
and records the integration work performed by Member 4 to connect SWMM hydraulic
outputs with GIS / DEM / flood-mapping components for the Chennai Flood Nowcasting & Decision-Support System (SIH 2026).

**Classification legend:**
- ✅ REAL + WORKING: Real data and functioning, tested code.
- 🟡 REAL DATA + NOT INTEGRATED: Genuine dataset present, but not connected hydraulically.
- 🔶 PARTIAL / PROTOTYPE: Working placeholder to test downstream schemas/pipelines.
- ❌ MOCK / HARDCODED / MISSING SOURCE: Prohibited or absent components.
- ⛔ MISSING DATASET: Required dataset not present in repository.

---

## 2. Git Status at Audit

```
Branch:       module-3-nilesh
Tracking:     origin/Module-3-(nilesh)
Clean Working Tree (Datasets/ preserved)
```

---

## 3. Architecture & Data Flow

```
data/raw/rainfall/chennai_imerg_2015.nc      ← Raw IMERG NetCDF (28 KB)
      ↓
scripts/rainfall/convert_imerg_to_swmm.py   ← IMERG → CSV converter (h5py)
      ↓
data/rainfall/chennai_imerg_2015.csv         ← 335 records, MM/DD/YYYY HH:MM, mm/hr
      ↓
swmm_engine/rainfall.py                     ← inject_rainfall() → modifies [TIMESERIES]
      ↓
swmm_engine/runner.py                       ← prepare_scenario_inp() + run_swmm_simulation()
swmm_engine/models/pilot_network.inp        ← Base SWMM model (3 nodes, 2 conduits)
      ↓  (via PySWMM 2.1.0 / EPA SWMM 5.2.4)
swmm_engine/outputs/direct_injected_*.rpt   ← Simulation outputs (node depths, flows)
      ↓
member4_gis/scripts/generate_outputs_from_rpt.py
      ↓
member4_gis/outputs/swmm_flood_nodes/
├── swmm_flood_nodes.gpkg                   ← GeoPackage (EPSG:4326, with peak timestamps)
├── swmm_flood_nodes.csv                    ← Node simulation results
├── swmm_conduit_results.csv                ← Link flows by scenario
└── scenario_comparison.json                ← Detailed hydraulic comparison report
```

---

## 4. SWMM Implementation Audit

### 4.1 Model Structure
| Component | Status | Notes |
|---|---|---|
| `pilot_network.inp` | ✅ REAL + WORKING | 3-node synthetic pilot model |
| `[OPTIONS]` | ✅ | DYNWAVE dynamic wave routing, CMS units, Horton infiltration |
| `[RAINGAGES]` | ✅ | RG1, INTENSITY format, 0:30 interval, linked to TS_RAIN |
| `[SUBCATCHMENTS]` | ✅ | S1: 5 ha, 75% impervious, routing to J1 |
| `[JUNCTIONS]` | ✅ | J1 (elev 10.0 m, max depth 2.0 m), J2 (elev 8.5 m, max depth 2.0 m) |
| `[CONDUITS]` | ✅ | C1 (300 m, 1.2 m circ), C2 (150 m, 1.2 m circ) |
| `[OUTFALLS]` | ✅ | OUT1 (FREE outfall, elev 7.0 m) |
| `[COORDINATES]` | ✅ | EPSG:4326: J1=(80.2707, 13.0827), J2=(80.2735, 13.0850), OUT1=(80.2760, 13.0872) |
| Simulation dates | ✅ | 2015-11-28 00:00:00 to 2015-12-04 23:30:00 UTC |

### 4.2 Scenario Implementation
| Scenario | Roughness multiplier | Conduit n | Status |
|---|---|---|---|
| normal | 1.0× | 0.013 | ✅ REAL |
| reduced_capacity | 1.6× | 0.0208 | ✅ REAL |
| severe_blockage | 2.5× | 0.0325 | ✅ REAL |

### 4.3 Simulation Outputs (2015 Chennai Flood Event)
| Node | Normal | Reduced Capacity | Severe Blockage |
|---|---|---|---|
| J1 (junction) | 0.28 m | 0.36 m | **0.47 m** |
| J2 (junction) | 0.23 m | 0.29 m | **0.39 m** |
| OUT1 (outfall) | 0.23 m | 0.29 m | **0.29 m** |
| Peak conduit flow (C1) | 0.306 m³/s | 0.306 m³/s | 0.306 m³/s |
| Conduit capacity used (C1)| 11% | 17% | 28% |
| Flooded nodes | 0 | 0 | 0 |

**Analysis**: Depth increases by **+0.19 m (+67.9%)** from normal to severe blockage, confirming hydraulic head elevation and backwater effects. No surface overflow occurred because the 1.2 m diameter conduits have theoretical capacity ~4 m³/s, while peak inflow from the 5 ha subcatchment is 0.306 m³/s.

### 4.4 Rainfall Verification & QA
- **Source**: NASA GPM IMERG v07 half-hourly satellite precipitation (`data/rainfall/chennai_imerg_2015.csv`).
- **Verified Row Count**: Exactly **335 data rows** (plus 1 header row = 336 lines in the file).
- **Missing Timestep Explained**: An exact check of 30-min deltas reveals a single 1-hour gap between Row 145 (`12/01/2015 00:30`) and Row 146 (`12/01/2015 01:30`). The satellite product skipped `12/01/2015 01:00`. Therefore, 7 days × 48 intervals = 336 expected minus 1 gap = exactly 335 records.
- **SWMM Injected Precipitation**: 384.708 mm reported by SWMM; matches sum of (rate * 0.5 hr) = 384.88 mm within 0.04%.
- **Zero random, synthetic, or fallback rainfall was used.**

---

## 5. GIS Assets Audit

| Asset | Status | Details |
|---|---|---|
| **Chennai Drainage GIS** | ✅ REAL + WORKING | `data/processed/drainage/chennai_swd.gpkg` (10,255 drain features, EPSG:4326) |
| **Copernicus DEM** | ✅ REAL + WORKING | `Datasets/DEM/chennai_dem_glo30.tif` (2520×2160 px, ~31m res, EPSG:4326) |
| **Historical Flood Extents** | ✅ REAL + WORKING | `Datasets/Histoical Flood Events/chennai_flood_extent_2015.gpkg` (4,001 unique features) |
| **Road Centerlines** | ⛔ MISSING | **No road centerline dataset exists in repository.** |
| **Road Flood Impact** | 🔶 PROTOTYPE PROXY | Uses drain geometries as structural proxy; **NOT actual road data** |

---

## 6. Road Impact: Critical Correction & Disclaimer

> **CRITICAL NOTICE:**
> **The road impact outputs (road_impact.csv, road_impact.gpkg) DO NOT represent actual road flood risk and must not be interpreted as road data.**

- **Why a proxy was used**: No Chennai road network or centerline dataset exists in the repository.
- **Methodology**: 500 stormwater drainage channel geometries from `chennai_swd.gpkg` were sampled and assigned flood depths via Inverse Distance Weighting (IDW) from the 3 SWMM nodes.
- **Contract Schema Validation**: Used strictly as a structural spatial placeholder to validate the downstream schema, risk thresholds, and routing-cost interface required by `docs/integration_contract.md`.
- **Eventual Pipeline**:
  REAL ROAD CENTERLINES + SWMM FLOOD INFORMATION → SPATIAL PROXIMITY → ROAD FLOOD DEPTH → ROAD RISK / PASSABILITY → EXISTING ROUTING.

---

## 7. DEM Quality Assurance & Negative Elevation Analysis

- **File**: `Datasets/DEM/chennai_dem_glo30.tif` (15 MB GeoTIFF)
- **Dimensions**: 2520 × 2160 pixels = 5,443,200 pixels.
- **CRS**: EPSG:4326, pixel size = 1 arc-second (~30.92 m).
- **Land Pixels (>= 0 m)**: 5,442,358 pixels (99.98% of raster). Elevation ranges from **0.0 m to 313.62 m**, with a mean land elevation of **23.10 m** and median of **17.51 m**.
- **Negative Pixels (< 0 m)**: Exactly **842 pixels (0.015% of raster)** with values down to -65.55 m.
- **Scientific Explanation**: These are radar phase noise and void-fill artifacts over water surfaces along the Bay of Bengal coastline and tidal estuaries. Copernicus GLO-30 is a TanDEM-X InSAR DSM where water causes specular reflection. No nodata tag was set in the GeoTIFF header (`nodata=None`), leaving these marine pixels with raw artifact values.
- **Downstream Handling**: Elevations should be clamped to $\ge 0.0$ m (`np.clip(dem, 0.0, None)`) in flood inundation routines.

---

## 8. Spatial Validation & Model Scale Distinction

- **Dataset**: 4,001 unique observed flood extent polygons from the 2015 Chennai floods.
- **Results**: 500 sampled historical centroids compared against 3 pilot SWMM nodes in projected UTM Zone 44N (`EPSG:32644`).
  - Mean nearest distance: **22.86 km**
  - Within 2 km tolerance: **2.2%** (11 points)
  - Minimum distance: **424.4 m**
- **CRITICAL DISTINCTION: Model Limitation vs. Code Failure**:
  The nearest-neighbor algorithm is 100% mathematically and spatially correct. The low match rate is purely a consequence of the pilot model covering a tiny 5-hectare local area (.27^\circ	ext{E}, 13.08^\circ	ext{N}$), whereas the historical observations span the entire Greater Chennai metropolitan region (>1,000 km²).

---

## 9. Deliverables Classification Table

| Component | Classification | Defensible Scope |
|---|---|---|
| IMERG Rainfall (2015) | **REAL** | NASA GPM satellite precipitation data |
| EPA SWMM 5.2.4 Engine | **REAL** | Standard hydraulic simulation engine |
| SWMM Pilot Network | **SYNTHETIC PILOT** | 3-node, 2-conduit demonstration network |
| Scenario Roughness Multipliers | **HYDRAULICALLY MEANINGFUL**| Demonstrates backwater & depth increases (+67.9%) |
| SWMM Flood Node Points | **REAL SIMULATION OUTPUT** | Accurate maximum depths & peak timestamps |
| Flood Map | **MVP (POINTS ONLY)** | No continuous flood raster; 3-point interpolation avoided |
| Copernicus GLO-30 DEM | **REAL** | 30 m resolution Digital Surface Model |
| Historical Flood Extents | **REAL** | 4,001 observed polygons from 2015 event |
| Chennai Drainage SWD | **REAL GIS (NOT HYDRAULIC)**| Municipal drain lines, not connected to SWMM model |
| Road Impact Layer | **PROTOTYPE PROXY** | **NOT actual road data**; drain proxy for schema testing |
| Backend Integration | **COMPILED BYTECODE ONLY** | Source .py files absent; integrated via GIS contracts |

---

*Audit completed by Member 4 — SIH 2026 Chennai Flood Nowcasting*
