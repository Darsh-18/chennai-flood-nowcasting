from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import DataStatusResponse
from app.services import get_data_status

router = APIRouter(prefix="/api", tags=["data-status"])


@router.get("/data-status", response_model=DataStatusResponse)
def data_status() -> dict:
    return get_data_status()
