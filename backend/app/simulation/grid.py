from __future__ import annotations

from typing import Any


def get_cells(dem_proxy: dict[str, Any]) -> list[dict[str, Any]]:
    cells = dem_proxy.get("cells", [])
    return cells if isinstance(cells, list) else []


def get_cell_lookup(dem_proxy: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {cell["cell_id"]: cell for cell in get_cells(dem_proxy) if "cell_id" in cell}


def get_zone_area_km2(dem_proxy: dict[str, Any]) -> float:
    return float(dem_proxy.get("zone_area_km2", 0.0) or 0.0)


def cell_feature(cell: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "Feature",
        "geometry": cell.get("geometry"),
        "properties": {
            "cell_id": cell.get("cell_id"),
            "classification": "INFERRED",
        },
    }
