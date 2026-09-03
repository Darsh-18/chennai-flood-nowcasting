export type RainfallIntensity = "moderate" | "heavy" | "extreme";
export type DrainageCondition = "normal" | "degraded" | "severe";
export type ForecastMinutes = 30 | 60 | 120 | 180;
export type DepthBand = "0-10cm" | "10-30cm" | "30-60cm" | ">60cm";
export type Confidence = "High" | "Moderate" | "Low";
export type RiskLevel = "safe" | "watch" | "likely" | "severe";
export type DataClassification = "OBSERVED" | "DERIVED" | "INFERRED" | "SIMULATED";

export interface Geometry {
  type: string;
  coordinates: unknown;
}

export interface GeoJsonFeature<TProperties = Record<string, unknown>> {
  type: "Feature";
  geometry: Geometry;
  properties: TProperties;
}

export interface FeatureCollection<TProperties = Record<string, unknown>> {
  type: "FeatureCollection";
  features: Array<GeoJsonFeature<TProperties>>;
}

export interface Scenario {
  rainfall_intensity: RainfallIntensity;
  drainage_condition: DrainageCondition;
  forecast_minutes: ForecastMinutes;
}

export interface FloodDrivers {
  rainfall?: Record<string, string | number>;
  runoff?: Record<string, string | number>;
  drainage_stress?: Record<string, string | number>;
  terrain_accumulation?: Record<string, string | number>;
  primary_cause?: string;
}

export interface FloodCell {
  cell_id: string;
  centroid_lat: number;
  centroid_lon: number;
  depth_band: DepthBand;
  confidence: Confidence;
  risk_level: RiskLevel;
  drivers: FloodDrivers;
  geometry?: Geometry;
}

export interface RoadSegment {
  road_id: string;
  name: string;
  geometry: Geometry;
  risk_level: RiskLevel;
  depth_band?: DepthBand | string | null;
  passable: boolean;
}

export interface KpiSummary {
  flood_risk: string;
  affected_area_km2: number;
  affected_road_count: number;
  forecast_label: string;
  overall_confidence: Confidence;
}

export interface AlertSummary {
  headline: string;
  detail: string;
  recommended_action: string;
}

export interface NowcastResponse {
  scenario: Scenario;
  mode: "DEMO" | "LIVE";
  generated_at_seed: string;
  flood_cells: FloodCell[];
  affected_roads: RoadSegment[];
  kpis: KpiSummary;
  alert: AlertSummary;
  model_label: "Reduced-order demonstration model";
}

export interface ForecastStep {
  label: string;
  forecast_minutes: number;
  flood_cells: FloodCell[];
  affected_roads: RoadSegment[];
  kpis: KpiSummary;
  alert: AlertSummary;
}

export interface ForecastResponse {
  scenario_key: string;
  mode: "DEMO" | "LIVE";
  generated_at_seed: string;
  steps: ForecastStep[];
  model_label: "Reduced-order demonstration model";
}

export interface ScenarioOptionsResponse {
  rainfall_intensity: RainfallIntensity[];
  drainage_condition: DrainageCondition[];
  forecast_minutes: ForecastMinutes[];
  default: Scenario;
}

export interface HealthResponse {
  status: "ok";
  mode: "DEMO" | "LIVE";
  fallback: boolean;
  message?: string;
}

export interface RoutePath {
  path: Geometry;
  distance_km: number;
  eta_min: number;
}

export interface RouteResponse {
  normal_route: RoutePath;
  flood_aware_route: RoutePath;
  explanation: string;
  simulated_label: "Simulated routing scenario";
}

export interface RouteRequest {
  start_infra_id: string;
  end_infra_id: string;
  scenario: Scenario;
}

export interface DataLayerStatus {
  name: string;
  status: "Demo" | "Historical" | "Live" | "Partial" | "Available";
  classification: DataClassification;
  detail?: string;
}

export interface DataStatusResponse {
  layers: DataLayerStatus[];
}

export interface CriticalInfraProperties {
  infra_id: string;
  name: string;
  type: string;
  classification: DataClassification;
}
