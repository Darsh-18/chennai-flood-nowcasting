from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import FeatureCollectionResponse
from app.services import get_critical_geojson

router = APIRouter(prefix="/api", tags=["critical-infrastructure"])


@router.get("/critical-infrastructure", response_model=FeatureCollectionResponse)
def critical_infrastructure() -> dict:
    return get_critical_geojson()
