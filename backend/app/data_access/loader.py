from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

LOGGER = logging.getLogger(__name__)
PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = PROJECT_ROOT / "data"


EMPTY_FEATURE_COLLECTION: dict[str, Any] = {"type": "FeatureCollection", "features": []}


@lru_cache(maxsize=64)
def load_json_file(filename: str) -> Any:
    path = DATA_DIR / filename
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError:
        LOGGER.warning("Missing data file %s; using empty fallback", path)
        if filename.endswith(".geojson"):
            return EMPTY_FEATURE_COLLECTION.copy()
        return {}
    except json.JSONDecodeError as exc:
        LOGGER.warning("Malformed data file %s: %s; using empty fallback", path, exc)
        if filename.endswith(".geojson"):
            return EMPTY_FEATURE_COLLECTION.copy()
        return {}


def load_feature_collection(filename: str) -> dict[str, Any]:
    data = load_json_file(filename)
    if not isinstance(data, dict) or data.get("type") != "FeatureCollection":
        LOGGER.warning("Data file %s is not a FeatureCollection; using empty fallback", filename)
        return EMPTY_FEATURE_COLLECTION.copy()
    data.setdefault("features", [])
    return data


def clear_data_cache() -> None:
    load_json_file.cache_clear()
