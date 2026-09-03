from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import FeatureCollectionResponse
from app.services import get_map_context_geojson, get_pilot_boundary_geojson

router = APIRouter(prefix="/api", tags=["map-layers"])


@router.get("/map-context", response_model=FeatureCollectionResponse)
def map_context() -> dict:
    return get_map_context_geojson()


@router.get("/pilot-boundary", response_model=FeatureCollectionResponse)
def pilot_boundary() -> dict:
    return get_pilot_boundary_geojson()
