from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"

LON_MIN = 80.235
LON_MAX = 80.265
LAT_MIN = 13.030
LAT_MAX = 13.060
ROWS = 6
COLS = 6


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def km_distance(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    radius_km = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    h = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * radius_km * math.asin(math.sqrt(h))


def cell_id(row: int, col: int) -> str:
    return f"cell-r{row}-c{col}"


def cell_for_point(lon: float, lat: float) -> str:
    col = min(COLS - 1, max(0, int((lon - LON_MIN) / ((LON_MAX - LON_MIN) / COLS))))
    row = min(ROWS - 1, max(0, int((lat - LAT_MIN) / ((LAT_MAX - LAT_MIN) / ROWS))))
    return cell_id(row, col)


def polygon(coords: list[list[float]]) -> dict[str, Any]:
    return {"type": "Polygon", "coordinates": [coords]}


def linestring(coords: list[list[float]]) -> dict[str, Any]:
    return {"type": "LineString", "coordinates": coords}


def feature(geometry: dict[str, Any], properties: dict[str, Any]) -> dict[str, Any]:
    return {"type": "Feature", "geometry": geometry, "properties": properties}


def feature_collection(features: list[dict[str, Any]]) -> dict[str, Any]:
    return {"type": "FeatureCollection", "features": features}


def pilot_boundary() -> dict[str, Any]:
    coords = [
        [LON_MIN, LAT_MIN],
        [LON_MAX, LAT_MIN],
        [LON_MAX, LAT_MAX],
        [LON_MIN, LAT_MAX],
        [LON_MIN, LAT_MIN],
    ]
    return feature_collection(
        [
            feature(
                polygon(coords),
                {
                    "name": "Pilot Zone (illustrative boundary)",
                    "classification": "SIMULATED",
                    "area_note": "Configurable 5-15 km2 pilot basin boundary for demo use.",
                },
            )
        ]
    )


def build_cells() -> list[dict[str, Any]]:
    lon_step = (LON_MAX - LON_MIN) / COLS
    lat_step = (LAT_MAX - LAT_MIN) / ROWS
    cells: list[dict[str, Any]] = []
    elevations: dict[str, float] = {}
    for row in range(ROWS):
        for col in range(COLS):
            lon0 = LON_MIN + col * lon_step
            lon1 = lon0 + lon_step
            lat0 = LAT_MIN + row * lat_step
            lat1 = lat0 + lat_step
            central_pocket = 1.0 if 2 <= row <= 3 and 2 <= col <= 3 else 0.0
            east_low = col / (COLS - 1)
            elevation = 7.8 - 0.58 * col + 0.16 * row - 0.85 * central_pocket
            terrain_factor = 0.92 + 0.11 * col + 0.06 * (ROWS - row) + 0.18 * central_pocket
            accumulation_factor = 2.25 + 0.34 * col + 0.22 * row + 1.65 * central_pocket
            base_capacity = 1.1 - 0.08 * central_pocket + (0.1 if col in {0, 5} else 0.0)
            if 2 <= row <= 3 and 2 <= col <= 3:
                base_capacity = 0.76
            coords = [
                [round(lon0, 6), round(lat0, 6)],
                [round(lon1, 6), round(lat0, 6)],
                [round(lon1, 6), round(lat1, 6)],
                [round(lon0, 6), round(lat1, 6)],
                [round(lon0, 6), round(lat0, 6)],
            ]
            cid = cell_id(row, col)
            elevations[cid] = elevation
            cells.append(
                {
                    "cell_id": cid,
                    "row": row,
                    "col": col,
                    "centroid": [round((lon0 + lon1) / 2, 6), round((lat0 + lat1) / 2, 6)],
                    "geometry": polygon(coords),
                    "terrain_factor": round(terrain_factor, 3),
                    "accumulation_factor": round(accumulation_factor, 3),
                    "base_drainage_capacity_cm_per_step": round(base_capacity, 3),
                    "elevation_proxy_m": round(elevation, 3),
                    "classification": "INFERRED",
                }
            )

    for cell in cells:
        row = cell["row"]
        col = cell["col"]
        current_elevation = elevations[cell["cell_id"]]
        candidates: list[tuple[float, int, int]] = []
        for d_row in (-1, 0, 1):
            for d_col in (-1, 0, 1):
                if d_row == 0 and d_col == 0:
                    continue
                n_row = row + d_row
                n_col = col + d_col
                if 0 <= n_row < ROWS and 0 <= n_col < COLS:
                    n_id = cell_id(n_row, n_col)
                    candidates.append((elevations[n_id], n_row, n_col))
        lower = [candidate for candidate in candidates if candidate[0] < current_elevation]
        if lower:
            _, n_row, n_col = min(lower, key=lambda item: item[0])
            cell["downstream_cell_id"] = cell_id(n_row, n_col)
        else:
            cell["downstream_cell_id"] = None
    return cells


def dem_proxy(cells: list[dict[str, Any]]) -> dict[str, Any]:
    width_km = km_distance(LON_MIN, LAT_MIN, LON_MAX, LAT_MIN)
    height_km = km_distance(LON_MIN, LAT_MIN, LON_MIN, LAT_MAX)
    return {
        "name": "Illustrative 30 m-class DEM proxy grid",
        "classification": "INFERRED",
        "zone_area_km2": round(width_km * height_km, 2),
        "rows": ROWS,
        "cols": COLS,
        "cells": cells,
    }


def sampled_cell_ids(coords: list[list[float]]) -> list[str]:
    ids: list[str] = []
    for idx in range(7):
        t = idx / 6
        lon = coords[0][0] + (coords[-1][0] - coords[0][0]) * t
        lat = coords[0][1] + (coords[-1][1] - coords[0][1]) * t
        cid = cell_for_point(lon, lat)
        if cid not in ids:
            ids.append(cid)
    return ids


def roads() -> dict[str, Any]:
    lon_values = [80.238, 80.244, 80.250, 80.256, 80.262]
    lat_values = [13.033, 13.039, 13.045, 13.051, 13.057]
    features: list[dict[str, Any]] = []
    road_count = 1
    horizontal_rows = [0, 2, 4]
    vertical_cols = [0, 1, 2, 4]
    for row_idx in horizontal_rows:
        lat = lat_values[row_idx]
        for col_idx in range(len(lon_values) - 1):
            coords = [[lon_values[col_idx], lat], [lon_values[col_idx + 1], lat]]
            road_id = f"road-{road_count:02d}"
            features.append(
                feature(
                    linestring(coords),
                    {
                        "road_id": road_id,
                        "name": f"Demo Street {road_count:02d}",
                        "classification": "SIMULATED",
                        "label": "Demo road network",
                        "cell_ids": sampled_cell_ids(coords),
                    },
                )
            )
            road_count += 1
    for col_idx in vertical_cols:
        lon = lon_values[col_idx]
        for row_idx in range(len(lat_values) - 1):
            coords = [[lon, lat_values[row_idx]], [lon, lat_values[row_idx + 1]]]
            road_id = f"road-{road_count:02d}"
            features.append(
                feature(
                    linestring(coords),
                    {
                        "road_id": road_id,
                        "name": f"Demo Street {road_count:02d}",
                        "classification": "SIMULATED",
                        "label": "Demo road network",
                        "cell_ids": sampled_cell_ids(coords),
                    },
                )
            )
            road_count += 1
    return feature_collection(features)


def map_context() -> dict[str, Any]:
    def block(
        coords: list[list[float]],
        kind: str,
        name: str,
        classification: str = "SIMULATED",
    ) -> dict[str, Any]:
        return feature(
            polygon(coords),
            {
                "kind": kind,
                "name": name,
                "classification": classification,
                "label": "Illustrative local basemap context",
            },
        )

    features = [
        block(
            [[80.235, 13.052], [80.244, 13.052], [80.244, 13.06], [80.235, 13.06], [80.235, 13.052]],
            "institution",
            "Demo civic precinct",
        ),
        block(
            [[80.244, 13.052], [80.257, 13.052], [80.257, 13.06], [80.244, 13.06], [80.244, 13.052]],
            "residential",
            "Demo north residential blocks",
        ),
        block(
            [[80.257, 13.052], [80.265, 13.052], [80.265, 13.06], [80.257, 13.06], [80.257, 13.052]],
            "open_space",
            "Demo open ground",
        ),
        block(
            [[80.235, 13.043], [80.246, 13.043], [80.246, 13.052], [80.235, 13.052], [80.235, 13.043]],
            "residential",
            "Demo west residential blocks",
        ),
        block(
            [[80.246, 13.041], [80.257, 13.041], [80.257, 13.052], [80.246, 13.052], [80.246, 13.041]],
            "commercial",
            "Demo market frontage",
        ),
        block(
            [[80.257, 13.041], [80.265, 13.041], [80.265, 13.052], [80.257, 13.052], [80.257, 13.041]],
            "residential",
            "Demo east mixed-use blocks",
        ),
        block(
            [[80.235, 13.03], [80.247, 13.03], [80.247, 13.043], [80.235, 13.043], [80.235, 13.03]],
            "residential",
            "Demo south-west neighborhood",
        ),
        block(
            [[80.247, 13.03], [80.258, 13.03], [80.258, 13.041], [80.247, 13.041], [80.247, 13.03]],
            "institution",
            "Demo response staging area",
        ),
        block(
            [[80.258, 13.03], [80.265, 13.03], [80.265, 13.041], [80.258, 13.041], [80.258, 13.03]],
            "water",
            "Demo canal-side low strip",
        ),
        block(
            [[80.261, 13.03], [80.265, 13.03], [80.265, 13.06], [80.262, 13.06], [80.261, 13.03]],
            "water",
            "Illustrative canal context",
        ),
        block(
            [[80.239, 13.036], [80.243, 13.036], [80.243, 13.04], [80.239, 13.04], [80.239, 13.036]],
            "open_space",
            "Demo neighborhood park",
        ),
        feature(
            linestring([[80.236, 13.049], [80.245, 13.047], [80.254, 13.046], [80.264, 13.044]]),
            {
                "kind": "arterial",
                "name": "Demo arterial corridor",
                "classification": "SIMULATED",
                "label": "Illustrative local basemap context",
            },
        ),
        feature(
            linestring([[80.241, 13.058], [80.249, 13.051], [80.257, 13.043], [80.263, 13.035]]),
            {
                "kind": "rail",
                "name": "Demo transit corridor",
                "classification": "SIMULATED",
                "label": "Illustrative local basemap context",
            },
        ),
    ]
    return feature_collection(features)


def drainage_network() -> dict[str, Any]:
    features = [
        feature(
            linestring([[80.237, 13.045], [80.263, 13.045]]),
            {
                "drain_id": "drain-east-west",
                "name": "Illustrative trunk drain",
                "classification": "SIMULATED",
                "label": "SIMULATED SCENARIO",
                "base_capacity_note": "Scenario capacity only; not municipal pipe data.",
            },
        ),
        feature(
            linestring([[80.250, 13.058], [80.250, 13.032]]),
            {
                "drain_id": "drain-north-south",
                "name": "Illustrative relief drain",
                "classification": "SIMULATED",
                "label": "SIMULATED SCENARIO",
                "base_capacity_note": "Scenario capacity only; not municipal pipe data.",
            },
        ),
        feature(
            linestring([[80.242, 13.052], [80.259, 13.035]]),
            {
                "drain_id": "drain-diagonal-low-pocket",
                "name": "Illustrative low-pocket drain",
                "classification": "SIMULATED",
                "label": "SIMULATED SCENARIO",
                "base_capacity_note": "Scenario capacity only; not municipal pipe data.",
            },
        ),
    ]
    return feature_collection(features)


def critical_infrastructure() -> dict[str, Any]:
    return feature_collection(
        [
            feature(
                {"type": "Point", "coordinates": [80.238, 13.057]},
                {
                    "infra_id": "hospital-north",
                    "name": "Demo Hospital Node",
                    "type": "Hospital",
                    "classification": "SIMULATED",
                },
            ),
            feature(
                {"type": "Point", "coordinates": [80.238, 13.033]},
                {
                    "infra_id": "fire-station-west",
                    "name": "Demo Fire Station Node",
                    "type": "Fire Station",
                    "classification": "SIMULATED",
                },
            ),
            feature(
                {"type": "Point", "coordinates": [80.262, 13.033]},
                {
                    "infra_id": "relief-center-south",
                    "name": "Demo Relief Center Node",
                    "type": "Relief Center",
                    "classification": "SIMULATED",
                },
            ),
        ]
    )


def rainfall_scenarios() -> dict[str, Any]:
    return {
        "moderate": {
            "classification": "OBSERVED",
            "source_label": "Historical replay pattern bundled for demo",
            "series_mm_hr": [18, 16, 14, 12, 10, 8],
        },
        "heavy": {
            "classification": "OBSERVED",
            "source_label": "Historical replay pattern bundled for demo",
            "series_mm_hr": [38, 44, 42, 36, 28, 20],
        },
        "extreme": {
            "classification": "OBSERVED",
            "source_label": "Historical replay pattern bundled for demo",
            "series_mm_hr": [62, 76, 82, 70, 56, 42],
        },
    }


def data_status() -> dict[str, Any]:
    return {
        "layers": [
            {
                "name": "Pilot Zone (illustrative boundary)",
                "status": "Demo",
                "classification": "SIMULATED",
                "detail": "Configurable bounded pilot basin used for the prototype.",
            },
            {
                "name": "Rainfall replay scenarios",
                "status": "Historical",
                "classification": "OBSERVED",
                "detail": "Bundled deterministic intensity curves for offline demonstration.",
            },
            {
                "name": "Terrain / DEM proxy grid",
                "status": "Demo",
                "classification": "INFERRED",
                "detail": "Coarse 30 m-class proxy factors for terrain and flow accumulation.",
            },
            {
                "name": "Drainage capacity scenario",
                "status": "Demo",
                "classification": "SIMULATED",
                "detail": "Illustrative capacity and degradation controls, not pipe inventory.",
            },
            {
                "name": "Road network subset",
                "status": "Demo",
                "classification": "SIMULATED",
                "detail": "Synthetic but connected road graph for routing demonstrations.",
            },
            {
                "name": "Local basemap context",
                "status": "Demo",
                "classification": "SIMULATED",
                "detail": "Offline land-use, canal, and local corridor shapes used only to make the pilot map readable.",
            },
            {
                "name": "Flood depth bands",
                "status": "Available",
                "classification": "DERIVED",
                "detail": "Derived from the reduced-order runoff, drainage, and terrain chain.",
            },
        ]
    }


def main() -> None:
    cells = build_cells()
    write_json(DATA_DIR / "pilot_boundary.geojson", pilot_boundary())
    write_json(DATA_DIR / "map_context.geojson", map_context())
    write_json(DATA_DIR / "roads.geojson", roads())
    write_json(DATA_DIR / "drainage_network.geojson", drainage_network())
    write_json(DATA_DIR / "critical_infrastructure.geojson", critical_infrastructure())
    write_json(DATA_DIR / "dem_proxy.json", dem_proxy(cells))
    write_json(DATA_DIR / "rainfall_scenarios.json", rainfall_scenarios())
    write_json(DATA_DIR / "data_status.json", data_status())
    print(f"Generated demo data in {DATA_DIR}")


if __name__ == "__main__":
    main()
