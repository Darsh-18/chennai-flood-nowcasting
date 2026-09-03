from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import Scenario, ScenarioOptionsResponse

router = APIRouter(prefix="/api", tags=["scenario"])


@router.get("/scenario", response_model=ScenarioOptionsResponse)
def get_scenario_options() -> ScenarioOptionsResponse:
    return ScenarioOptionsResponse(
        rainfall_intensity=["moderate", "heavy", "extreme"],
        drainage_condition=["normal", "degraded", "severe"],
        forecast_minutes=[30, 60, 120, 180],
        default=Scenario(rainfall_intensity="heavy", drainage_condition="normal", forecast_minutes=60),
    )
