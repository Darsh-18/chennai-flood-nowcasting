from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import FloodStateResponse
from app.services import get_flood_state

router = APIRouter(prefix="/api", tags=["flood-state"])


@router.get("/flood-state", response_model=FloodStateResponse)
def flood_state(scenario_key: str = Query(...)) -> FloodStateResponse:
    try:
        return get_flood_state(scenario_key)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
