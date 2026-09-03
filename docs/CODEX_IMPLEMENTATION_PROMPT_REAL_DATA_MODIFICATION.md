# Codex Prompt Modification: Real Dataset Integration Layer

Use this as a direct modification to the existing SIH26085 Chennai Urban Flood Nowcasting implementation prompt. Do not replace the existing prototype specification. Keep the architecture, UI/UX direction, React Bits-inspired dashboard polish, reduced-order simulation workflow, drainage degradation scenario, 0-3 hour forecast, map, road-impact analysis, emergency routing, data-status panel, and judge demo flow unless a requirement below directly conflicts.

## Modification Objective

Modify the existing prototype so actual supplied project datasets are used wherever available. Demo/generated data remains available only as a deterministic fallback.

The conceptual pipeline remains unchanged:

```text
RAIN
↓
RUNOFF
↓
DRAINAGE STRESS
↓
SURFACE FLOODING
↓
ROAD IMPACT
↓
EMERGENCY ROUTING
```

The change is data integration, not a new application design.

## Non-Negotiable Real Data Rule

Before implementation, inspect every supplied dataset file under `/data/raw` and any attached dataset directory. Do not invent dataset properties.

For each dataset, determine and document:

1. Dataset name
2. File format
3. Geographic coverage
4. CRS
5. Important fields/attributes
6. Spatial resolution where applicable
7. Temporal resolution where applicable
8. What the dataset represents
9. Which existing prototype feature should consume it
10. Any preprocessing required

If a property cannot be determined from the supplied files, explicitly write `Not determined from supplied files`.

## Data Priority

Use this priority everywhere:

1. Actual supplied dataset
2. Processed version of actual supplied dataset
3. Existing deterministic demo/replay data only as fallback

Never use decorative fake drainage lines, fake roads, fake basemap structures, or generic demo layers when an actual equivalent dataset is available.

## Required Project Structure Changes

Preserve the existing project structure and add:

```text
/data
  /raw          # untouched supplied datasets
  /processed    # normalized, clipped, app-ready outputs
/docs
  DATA_INVENTORY.md
  DATA_PROVENANCE.md
/scripts
  inspect_datasets.py
  preprocess_real_data.py
```

Raw data must remain untouched. All transformations must be reproducible through scripts.

## Dataset Audit Output

Create `/docs/DATA_INVENTORY.md` before wiring datasets into the app. Use this table:

```markdown
| Dataset | File(s) | Format | Coverage | CRS | Important Fields | Spatial Resolution | Temporal Resolution | Represents | Existing Feature | Preprocessing | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
```

Do not fill unknown values by assumption.

## Data To Existing Feature Mapping

Map actual datasets only to existing features:

- Real rainfall data → existing rainfall input → runoff calculation
- Real DEM/elevation data → existing terrain layer → slope/flow accumulation → flood propagation
- Real drainage data → existing drainage layer → drainage stress/model
- Real road data → existing road layer → road flood impact → emergency routing
- Real critical infrastructure data → existing routing start/destination selectors
- Real historical flood observations → existing historical replay/validation feature, only if supplied data supports it

Do not create unnecessary new features just because a dataset exists.

## Backend Integration Requirements

Keep FastAPI, Pydantic v2, adapter interfaces, deterministic simulation, and fallback behavior.

Add or extend data-access modules so the backend can load:

- Real rainfall time series or event data
- Real DEM/terrain data or derived terrain factors
- Real drainage geometry
- Real road geometry
- Real historical flood observations, if available
- Real critical infrastructure points, if available

Adapters must expose normalized app-ready data to the existing simulation and routing code. Large datasets must be clipped to the actual pilot region and converted to WGS84 app-ready GeoJSON or compact JSON where appropriate.

If actual drainage geometry exists but no measured pipe capacity exists, use real geometry with simulated capacity/degradation values and label them `SIMULATED SCENARIO`.

## Preprocessing Requirements

Implement preprocessing under `/scripts` where needed:

- KML/KMZ → GeoJSON
- Shapefile/GPKG → cleaned GeoJSON
- GeoTIFF/DEM → clipped terrain-factor and accumulation proxy JSON
- CSV/XLSX rainfall → normalized rainfall scenario JSON
- CSV/GeoJSON flood observations → normalized historical event layer

Normalize CRS where required. Clip large files to the pilot region. Preserve source filenames and provenance in processed metadata.

## Map Requirements

The existing map must display actual datasets when available:

- Actual drainage network
- Actual road network
- Actual DEM/terrain-derived layer
- Actual historical flood observation layer, if supplied
- Actual critical infrastructure, if supplied

The judge must be able to toggle these layers on and off through the existing layer controls. If a real layer is missing, show the deterministic fallback layer and clearly label it as fallback/demo.

## Data Transparency Requirements

Extend the existing Data Status panel. For each dataset show:

- Dataset name
- Source
- Type
- Coverage
- Format
- CRS
- Status
- Classification: `OBSERVED`, `DERIVED`, `INFERRED`, or `SIMULATED`
- Whether the currently visible layer is real supplied data, processed real data, or deterministic demo fallback

The UI must clearly acknowledge that complete underground drainage hydraulic data is not available unless the supplied files prove otherwise.

## Historical Replay / Validation

If supplied datasets contain historical flood observations and rainfall events, connect them to the existing historical replay workflow.

The judge should be able to select an actual historical event and see:

- `OBSERVED DATA`
- `MODELLED RESULT`

Do not fabricate accuracy percentages. Calculate validation metrics only when the supplied datasets contain enough information to support those metrics. Otherwise show a qualitative comparison and state what fields are missing.

## Simulation Boundaries

Keep simulation for future states and unknown values:

Real where available:

- Drainage geometry
- Roads
- DEM/elevation
- Rainfall observations or historical rainfall events
- Historical flood observations

Simulated where real data does not exist:

- Drainage degradation percentage
- Future drainage-capacity reduction
- Future flood state
- Future road passability
- Flood-aware routing under forecast conditions

All simulated scenario values must be labeled `SIMULATED SCENARIO`.

## Fallback / Resilience

Do not break the current demo. If a dataset is missing, malformed, too large, has unknown CRS, or cannot be processed:

1. Log the issue.
2. Show a Data Status warning.
3. Continue using the existing deterministic demo/replay fallback.
4. Never show a blank page or broken API error.

## Acceptance Criteria Additions

Add these checks to the existing acceptance criteria:

- `/docs/DATA_INVENTORY.md` exists and inventories every supplied dataset without invented properties.
- Raw supplied files remain untouched under `/data/raw`.
- Processed app-ready files are generated under `/data/processed`.
- Actual supplied datasets take priority over deterministic demo data.
- Map layers use actual road, drainage, terrain, flood-observation, and infrastructure datasets where available.
- Data Status panel shows provenance and classification for every supplied dataset.
- Demo fallback still works when real datasets are missing.
- Historical replay uses actual historical observations only when supplied data supports it.

## Explicit Non-Goals

Do not rebuild the app from scratch. Do not redesign the dashboard. Do not replace the existing UI, map, sidebar, KPI cards, forecast timeline, scenario controls, routing interface, data-status panel, or demo flow. Do not claim real-time blockage detection, validated flood depth accuracy, or official operational deployment unless supplied datasets and project authorization explicitly prove it.
