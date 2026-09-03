from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import HealthResponse
from app.services import get_health

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return get_health()
