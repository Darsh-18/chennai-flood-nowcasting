from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


RainfallIntensity = Literal["moderate", "heavy", "extreme"]
DrainageCondition = Literal["normal", "degraded", "severe"]
ForecastMinutes = Literal[30, 60, 120, 180]
DepthBand = Literal["0-10cm", "10-30cm", "30-60cm", ">60cm"]
Confidence = Literal["High", "Moderate", "Low"]
RiskLevel = Literal["safe", "watch", "likely", "severe"]
DataClassification = Literal["OBSERVED", "DERIVED", "INFERRED", "SIMULATED"]


class Scenario(BaseModel):
    rainfall_intensity: RainfallIntensity
    drainage_condition: DrainageCondition
    forecast_minutes: ForecastMinutes


class FloodCell(BaseModel):
    cell_id: str
    centroid_lat: float
    centroid_lon: float
    depth_band: DepthBand
    confidence: Confidence
    risk_level: RiskLevel
    drivers: dict[str, Any]
    geometry: dict[str, Any] | None = None


class RoadSegment(BaseModel):
    road_id: str
    name: str
    geometry: dict[str, Any]
    risk_level: RiskLevel
    depth_band: Optional[str] = None
    passable: bool


class NowcastRequest(BaseModel):
    rainfall_intensity: RainfallIntensity
    drainage_condition: DrainageCondition
    forecast_minutes: ForecastMinutes


class KpiSummary(BaseModel):
    flood_risk: str
    affected_area_km2: float
    affected_road_count: int
    forecast_label: str
    overall_confidence: Confidence


class AlertSummary(BaseModel):
    headline: str
    detail: str
    recommended_action: str


class NowcastResponse(BaseModel):
    scenario: Scenario
    mode: Literal["DEMO", "LIVE"]
    generated_at_seed: str
    flood_cells: list[FloodCell]
    affected_roads: list[RoadSegment]
    kpis: KpiSummary
    alert: AlertSummary
    model_label: Literal["Reduced-order demonstration model"] = "Reduced-order demonstration model"


class ScenarioOptionsResponse(BaseModel):
    rainfall_intensity: list[RainfallIntensity]
    drainage_condition: list[DrainageCondition]
    forecast_minutes: list[ForecastMinutes]
    default: Scenario


class FloodStateResponse(BaseModel):
    scenario_key: str
    flood_cells: list[FloodCell]


class ForecastStep(BaseModel):
    label: str
    forecast_minutes: int
    flood_cells: list[FloodCell]
    affected_roads: list[RoadSegment]
    kpis: KpiSummary
    alert: AlertSummary


class ForecastResponse(BaseModel):
    scenario_key: str
    mode: Literal["DEMO", "LIVE"]
    generated_at_seed: str
    steps: list[ForecastStep]
    model_label: Literal["Reduced-order demonstration model"] = "Reduced-order demonstration model"


class RouteRequest(BaseModel):
    start_infra_id: str
    end_infra_id: str
    scenario: Scenario


class RoutePath(BaseModel):
    path: dict[str, Any]
    distance_km: float
    eta_min: float


class RouteResponse(BaseModel):
    normal_route: RoutePath
    flood_aware_route: RoutePath
    explanation: str
    simulated_label: Literal["Simulated routing scenario"] = "Simulated routing scenario"


class DataLayerStatus(BaseModel):
    name: str
    status: Literal["Demo", "Historical", "Live", "Partial", "Available"]
    classification: DataClassification
    detail: str | None = None


class DataStatusResponse(BaseModel):
    layers: list[DataLayerStatus]


class HealthResponse(BaseModel):
    status: Literal["ok"]
    mode: Literal["DEMO", "LIVE"]
    fallback: bool = False
    message: str | None = None


class FeatureCollectionResponse(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[dict[str, Any]] = Field(default_factory=list)
