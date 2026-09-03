from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import FeatureCollectionResponse
from app.services import get_drainage_geojson

router = APIRouter(prefix="/api", tags=["drainage"])


@router.get("/drainage", response_model=FeatureCollectionResponse)
def drainage() -> dict:
    return get_drainage_geojson()
