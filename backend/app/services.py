from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Any

from app.adapters.dem_adapter import DemoDemAdapter, LiveDemAdapter
from app.adapters.drainage_adapter import DemoDrainageAdapter, LiveDrainageAdapter
from app.adapters.rainfall_adapter import DemoRainfallAdapter, LiveRainfallAdapter
from app.data_access.loader import load_feature_collection, load_json_file
from app.models.schemas import (
    AlertSummary,
    FloodStateResponse,
    ForecastResponse,
    ForecastStep,
    HealthResponse,
    NowcastRequest,
    NowcastResponse,
    Scenario,
)
from app.routing.router import calculate_routes
from app.simulation.constants import FORECAST_STEPS, TIMELINE_CHECKPOINTS
from app.simulation.model import run_forecast_sequence, stable_seed

LOGGER = logging.getLogger(__name__)


def requested_live_mode() -> bool:
    value = os.getenv("DEMO_MODE", "").lower()
    if value in {"1", "true", "yes"}:
        return False
    run_mode = os.getenv("RUN_MODE", os.getenv("APP_MODE", "DEMO")).upper()
    return run_mode in {"LIVE", "LIVE_MODE"}


def _load_demo_inputs() -> dict[str, Any]:
    return {
        "rainfall": DemoRainfallAdapter().get_rainfall_scenarios(),
        "dem": DemoDemAdapter().get_dem_proxy(),
        "drainage": DemoDrainageAdapter().get_drainage_network(),
        "roads": load_feature_collection("roads.geojson"),
        "critical": load_feature_collection("critical_infrastructure.geojson"),
        "map_context": load_feature_collection("map_context.geojson"),
        "pilot_boundary": load_feature_collection("pilot_boundary.geojson"),
    }


def load_inputs_with_mode() -> tuple[dict[str, Any], str, bool, str | None]:
    if not requested_live_mode():
        return _load_demo_inputs(), "DEMO", False, None
    try:
        data = {
            "rainfall": LiveRainfallAdapter().get_rainfall_scenarios(),
            "dem": LiveDemAdapter().get_dem_proxy(),
            "drainage": LiveDrainageAdapter().get_drainage_network(),
            "roads": load_feature_collection("roads.geojson"),
            "critical": load_feature_collection("critical_infrastructure.geojson"),
            "map_context": load_feature_collection("map_context.geojson"),
            "pilot_boundary": load_feature_collection("pilot_boundary.geojson"),
        }
        return data, "LIVE", False, None
    except Exception as exc:  # noqa: BLE001 - fallback is deliberate adapter behavior.
        LOGGER.warning("Live adapter failed; falling back to demo mode: %s", exc)
        return _load_demo_inputs(), "DEMO", True, "Fell back to Demo Mode"


def scenario_key(scenario: Scenario | NowcastRequest) -> str:
    return f"{scenario.rainfall_intensity}:{scenario.drainage_condition}:{scenario.forecast_minutes}"


def parse_scenario_key(key: str) -> Scenario:
    try:
        rainfall, drainage, forecast = key.split(":")
        return Scenario(
            rainfall_intensity=rainfall,
            drainage_condition=drainage,
            forecast_minutes=int(forecast),
        )
    except Exception as exc:  # noqa: BLE001
        raise ValueError("scenario_key must look like rainfall:drainage:forecast_minutes") from exc


@lru_cache(maxsize=128)
def _forecast_cached(rainfall: str, drainage: str) -> tuple[dict[int, dict[str, Any]], str, str]:
    inputs, mode, _fallback, _message = load_inputs_with_mode()
    base = Scenario(rainfall_intensity=rainfall, drainage_condition=drainage, forecast_minutes=60)
    sequence = run_forecast_sequence(base, inputs["rainfall"], inputs["dem"], inputs["roads"])
    return sequence, mode, stable_seed(rainfall, drainage)


def get_nowcast(request: NowcastRequest) -> NowcastResponse:
    scenario = Scenario(**request.model_dump())
    sequence, mode, seed = _forecast_cached(scenario.rainfall_intensity, scenario.drainage_condition)
    snapshot = sequence[scenario.forecast_minutes]
    return NowcastResponse(
        scenario=scenario,
        mode=mode,
        generated_at_seed=stable_seed(seed, scenario.forecast_minutes),
        flood_cells=snapshot["flood_cells"],
        affected_roads=snapshot["affected_roads"],
        kpis=snapshot["kpis"],
        alert=snapshot["alert"],
    )


def get_flood_state(key: str) -> FloodStateResponse:
    scenario = parse_scenario_key(key)
    nowcast = get_nowcast(NowcastRequest(**scenario.model_dump()))
    return FloodStateResponse(scenario_key=key, flood_cells=nowcast.flood_cells)


def get_forecast(key: str) -> ForecastResponse:
    scenario = parse_scenario_key(key)
    sequence, mode, seed = _forecast_cached(scenario.rainfall_intensity, scenario.drainage_condition)
    steps: list[ForecastStep] = []
    for minutes in [0, *FORECAST_STEPS]:
        snapshot = sequence[minutes]
        if minutes == 0:
            alert = AlertSummary(
                headline="Prototype nowcast ready",
                detail="NOW shows the pilot-zone baseline before forecast accumulation is applied.",
                recommended_action="Select a future checkpoint to inspect simulated flood evolution.",
            )
        else:
            alert = snapshot["alert"]
        steps.append(
            ForecastStep(
                label=TIMELINE_CHECKPOINTS[minutes],
                forecast_minutes=minutes,
                flood_cells=snapshot["flood_cells"],
                affected_roads=snapshot["affected_roads"],
                kpis=snapshot["kpis"],
                alert=alert,
            )
        )
    return ForecastResponse(
        scenario_key=key,
        mode=mode,
        generated_at_seed=stable_seed(seed, "forecast"),
        steps=steps,
    )


def get_health() -> HealthResponse:
    _inputs, mode, fallback, message = load_inputs_with_mode()
    return HealthResponse(status="ok", mode=mode, fallback=fallback, message=message)


def get_drainage_geojson() -> dict[str, Any]:
    inputs, _mode, _fallback, _message = load_inputs_with_mode()
    return inputs["drainage"]


def get_roads_geojson() -> dict[str, Any]:
    return load_feature_collection("roads.geojson")


def get_critical_geojson() -> dict[str, Any]:
    return load_feature_collection("critical_infrastructure.geojson")


def get_map_context_geojson() -> dict[str, Any]:
    return load_feature_collection("map_context.geojson")


def get_pilot_boundary_geojson() -> dict[str, Any]:
    return load_feature_collection("pilot_boundary.geojson")


def get_data_status() -> dict[str, Any]:
    data = load_json_file("data_status.json")
    return data if isinstance(data, dict) and "layers" in data else {"layers": []}


def route_for_request(start_infra_id: str, end_infra_id: str, scenario: Scenario):
    nowcast = get_nowcast(NowcastRequest(**scenario.model_dump()))
    return calculate_routes(
        get_roads_geojson(),
        get_critical_geojson(),
        nowcast.affected_roads,
        start_infra_id,
        end_infra_id,
    )
