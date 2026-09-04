# Chennai Flood Nowcasting Integration Contract

**Contract version:** 0.1.0  
**Status:** canonical integration target; existing interfaces remain unchanged.  
**Scope:** rainfall → SWMM → flood/GIS → roads → road risk → routing → frontend.

## 1. Rules shared by all integrations

- API payloads are JSON; spatial feature collections use GeoJSON objects.
- Geographic coordinates use `EPSG:4326`, with GeoJSON positions ordered
  `[longitude, latitude]`.
- `x` and `y` are retained for the SWMM model-coordinate pair. Every payload
  carrying them must state `model_coordinate_crs`. Where that CRS is
  `EPSG:4326`, `x == longitude` and `y == latitude`.
- Metric fields use the unit in their name: `_m`, `_cms`, `_mm_per_hr`,
  `_km`, or `_min`.
- Event timestamps use ISO-8601 with an offset, preferably UTC (for example
  `2015-11-28T00:00:00+00:00`). Dataset-native source strings may be retained
  in a provenance field but are not canonical timestamps.
- `scenario` is an explicit identifier. It is never inferred from a display
  label or from rainfall intensity.
- A consumer must preserve `source`, `model_type`, and `provenance` so that a
  simulated pilot result is never displayed as an observed Chennai flood.

## 2. Current repository interfaces and data

### 2.1 SWMM service (current)

The active SWMM FastAPI service is `swmm_engine.api`.

`POST /api/v1/swmm/simulate`

```json
{
  "scenario": "normal",
  "rainfall_csv_path": "data/rainfall/chennai_imerg_2015.csv"
}
```

- `scenario` defaults to `normal`; supported values currently configured are
  `normal`, `reduced_capacity`, and `severe_blockage`.
- `rainfall_csv_path` is optional. When supplied, rainfall is injected into a
  scenario-specific copied `.inp` before EPA SWMM runs.

The current success response is intentionally left unchanged:

```json
{
  "status": "success",
  "metadata": {"engine": "SWMM 5 (pyswmm)", "scenario": "normal", "assumptions": {}},
  "summary": {"total_nodes": 3, "flooded_nodes": 0, "maximum_depth_m": 0.2767},
  "nodes": [
    {"id": "J1", "max_depth_m": 0.2767, "max_flooding_cms": 0.0, "flooded": false}
  ],
  "conduits": [{"id": "C1", "max_flow_cms": 0.305802}]
}
```

The current runner returns maximum values over the run, not a hydraulic
timeseries. The pilot model has coordinate records in its `.inp`, but the
service does not currently return node coordinates or simulation-event
metadata.

### 2.2 Rainfall (current)

`data/rainfall/chennai_imerg_2015.csv` has columns:

```text
timestamp,rainfall_mm
11/28/2015 00:00,0.0
```

`rainfall_mm` is a compatibility name. It represents spatially averaged IMERG
**intensity in mm/hr**, not accumulated depth. Timestamps use
`MM/DD/YYYY HH:MM`; there are 335 source records from 2015-11-28 00:00 through
2015-12-04 23:30, with one original source gap. The SWMM gage is `INTENSITY`
with a nominal `0:30` interval.

### 2.3 Scenario (current)

`swmm_engine/config/default_params.json` defines `roughness_multiplier`:

| Scenario | Multiplier | Applied before SWMM execution |
|---|---:|---|
| `normal` | 1.0 | base Manning n (`0.013` in the pilot model) |
| `reduced_capacity` | 1.6 | copied conduit Manning n (`0.0208`) |
| `severe_blockage` | 2.5 | copied conduit Manning n (`0.0325`) |

Scenario preparation never changes `swmm_engine/models/pilot_network.inp`.

### 2.4 GIS, road/routing, frontend/backend (current)

- `data/processed/drainage/chennai_swd.gpkg`, layer `drains`, contains 10,255
  `MultiLineString` drainage features in `EPSG:4326`. It includes attributes
  such as `DRAIN_ID`, `DRAIN_LEN`, `DRAIN_WID`, `DRAIN_DEP`, `INVERT_SP`,
  `INVERT_EP`, `STATUS`, `WARD`, `ZONE`, `ST_NAME`, and `RD_GEO_ID`.
- A KML-to-SWMM utility exists, but the live pilot SWMM model is still a
  synthetic three-node network. The GeoPackage is not connected to its nodes
  or conduits.
- No road graph or canonical road dataset is present in the repository.
- A separate compiled backend prototype exposes `/api/flood-state`,
  `/api/route`, `/api/nowcast`, `/api/drainage`, and map-layer endpoints. Its
  observed route request uses `start_infra_id`, `end_infra_id`, and a
  categorical scenario; its response contains `normal_route` and
  `flood_aware_route` with `path`, `distance_km`, and `eta_min`.
- That prototype exposes categorical `FloodCell.depth_band` and
  `RoadSegment.risk_level`/`passable`, rather than metric flood depths or
  routing costs. Its Python source is not present in this worktree (only
  compiled bytecode), so it is not an implementation integration point yet.
- The checked-in frontend contains only built `dist` assets; no editable
  frontend source or contract client is present.

## 3. Canonical contracts

These are the payloads to be produced by adapters around current components.
They do **not** change either existing API in this contract-only change.

### A. Canonical SWMM simulation result

```json
{
  "contract_version": "0.1.0",
  "status": "success",
  "scenario": "normal",
  "simulation": {
    "event_id": "imerg-2015-11-28_normal",
    "start_at": "2015-11-28T00:00:00+00:00",
    "end_at": "2015-12-04T23:30:00+00:00",
    "rainfall_record_count": 335,
    "rainfall_unit": "mm/hr",
    "model_type": "synthetic_pilot_network",
    "model_coordinate_crs": "EPSG:4326"
  },
  "nodes": [
    {
      "node_id": "J1",
      "x": 80.2707,
      "y": 13.0827,
      "longitude": 80.2707,
      "latitude": 13.0827,
      "max_depth_m": 0.2767,
      "max_flooding_cms": 0.0,
      "flooded": false,
      "scenario": "normal",
      "event_id": "imerg-2015-11-28_normal",
      "simulation_start_at": "2015-11-28T00:00:00+00:00",
      "simulation_end_at": "2015-12-04T23:30:00+00:00"
    }
  ],
  "provenance": {
    "rainfall_source": "NASA GPM IMERG",
    "hydraulic_engine": "EPA SWMM 5.2.4 via PySWMM 2.1.0"
  }
}
```

`node_id`, `max_depth_m`, `max_flooding_cms`, and `flooded` map directly from
the current SWMM response (`id` is renamed only in the adapter). Coordinates
must be read from the same `.inp` actually simulated, not guessed from a
drainage feature.

### B. Flood-to-road assessment input

The flood/GIS adapter emits a FeatureCollection or an equivalent array of this
record. Point geometry is appropriate for node results; a future inundation
model may emit polygons while retaining the same properties.

```json
{
  "type": "Feature",
  "geometry": {"type": "Point", "coordinates": [80.2707, 13.0827]},
  "properties": {
    "flood_id": "imerg-2015-11-28_normal:J1",
    "node_id": "J1",
    "depth_m": 0.2767,
    "flooded": false,
    "scenario": "normal",
    "event_id": "imerg-2015-11-28_normal",
    "simulation_start_at": "2015-11-28T00:00:00+00:00",
    "simulation_end_at": "2015-12-04T23:30:00+00:00",
    "crs": "EPSG:4326",
    "source": "swmm_node_maximum",
    "model_type": "synthetic_pilot_network"
  }
}
```

`depth_m` is the SWMM node maximum depth. It is not a road-surface inundation
depth until an approved node-to-surface/road method is supplied.

### C. Canonical road-risk output

```json
{
  "road_id": "road-123",
  "geometry": {"type": "LineString", "coordinates": [[80.27, 13.08], [80.28, 13.09]]},
  "crs": "EPSG:4326",
  "flood_depth_m": 0.0,
  "risk": "safe",
  "routing_cost": 125.4,
  "blocked": false,
  "scenario": "normal",
  "event_id": "imerg-2015-11-28_normal",
  "assessment_method": "documented_method_name"
}
```

Rules:

- `road_id` must be stable across graph builds; never use a display name as an
  identifier.
- `geometry` is the road-edge geometry in `EPSG:4326`.
- `flood_depth_m` is numeric and must identify its assessment method.
- `risk` is one of `safe`, `watch`, `likely`, or `severe` to remain compatible
  with the existing backend vocabulary.
- `routing_cost` is a non-negative scalar in the graph's chosen cost unit.
  The graph metadata must state whether it represents time, distance, or a
  penalized combination.
- `blocked: true` means the edge must be excluded from routing.

### D. Canonical routing request and result

```json
{
  "origin": {"type": "Feature", "geometry": {"type": "Point", "coordinates": [80.27, 13.08]}, "properties": {"id": "origin-1"}},
  "destination": {"type": "Feature", "geometry": {"type": "Point", "coordinates": [80.28, 13.09]}, "properties": {"id": "destination-1"}},
  "road_graph_id": "chennai-roads-v1",
  "road_risk_event_id": "imerg-2015-11-28_normal",
  "scenario": "normal"
}
```

```json
{
  "route_id": "route-uuid",
  "scenario": "normal",
  "event_id": "imerg-2015-11-28_normal",
  "geometry": {"type": "LineString", "coordinates": [[80.27, 13.08], [80.28, 13.09]]},
  "crs": "EPSG:4326",
  "distance_km": 1.24,
  "routing_cost": 9.8,
  "risk_summary": {"max_risk": "watch", "affected_edge_count": 2},
  "blocked_roads_avoided": ["road-456"]
}
```

The router must use the road-risk records whose `event_id` and `scenario`
match the request. `blocked_roads_avoided` contains IDs excluded because of
flood risk, not merely roads absent from the graph.

## 4. Required adapters and compatibility gaps

| Boundary | Current state | Required compatible adapter/dependency |
|---|---|---|
| SWMM → flood/GIS | Node results have `id` and metrics only. | Read `[COORDINATES]` from the simulated `.inp`; add event timestamps, CRS, and provenance in an adapter. |
| Pilot SWMM → Chennai drainage | Synthetic `J1`, `J2`, `OUT1`; GPKG is independent. | A validated GIS-to-SWMM network mapping. Do not spatially join them by proximity and call it a hydraulic model. |
| Flood → road | No road dataset/graph and no depth-transfer method. | Road GeoJSON/graph with stable IDs plus a documented method to assess road depth from flood features. |
| Road risk → routing | Prototype accepts infrastructure IDs and categorical scenario, not this canonical payload. | Adapter from canonical origin/destination and road-risk data to the prototype or replacement router when editable source is available. |
| SWMM API → prototype backend | Separate FastAPI apps; no integration route is registered in the prototype OpenAPI. | Service client/orchestrator, request correlation/event IDs, and error handling. |
| Frontend | Built assets only; source/API client unavailable. | Editable frontend source and a typed client for the canonical result/route contracts. |

## 5. Implementation guidance

1. Keep `/api/v1/swmm/simulate` unchanged; build a versioned adapter endpoint
   or internal mapper for the canonical SWMM result.
2. Generate `event_id` once at orchestration time and pass it through every
   downstream record.
3. Reject CRS-less geometries at the GIS/road boundary.
4. Keep a `model_type: synthetic_pilot_network` label until the real drainage
   GeoPackage is validated, converted, and used by the executed SWMM model.
5. Do not manufacture road risk, road geometries, flood depths, or node-to-
   drainage mappings merely to satisfy this contract.
