from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import ForecastResponse
from app.services import get_forecast

router = APIRouter(prefix="/api", tags=["forecast"])


@router.get("/forecast", response_model=ForecastResponse)
def forecast(scenario_key: str = Query(...)) -> ForecastResponse:
    try:
        return get_forecast(scenario_key)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
