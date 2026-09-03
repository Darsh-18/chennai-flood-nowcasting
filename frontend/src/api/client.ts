import type {
  DataStatusResponse,
  FeatureCollection,
  ForecastResponse,
  HealthResponse,
  NowcastResponse,
  RouteRequest,
  RouteResponse,
  Scenario,
  ScenarioOptionsResponse,
} from "../types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body.message ?? body.detail ?? `API request failed with ${response.status}`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return response.json() as Promise<T>;
}

export function scenarioKey(scenario: Scenario): string {
  return `${scenario.rainfall_intensity}:${scenario.drainage_condition}:${scenario.forecast_minutes}`;
}

export function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}

export function fetchScenarioOptions(): Promise<ScenarioOptionsResponse> {
  return request<ScenarioOptionsResponse>("/api/scenario");
}

export function fetchNowcast(scenario: Scenario): Promise<NowcastResponse> {
  return request<NowcastResponse>("/api/nowcast", {
    method: "POST",
    body: JSON.stringify(scenario),
  });
}

export function fetchForecast(scenario: Scenario): Promise<ForecastResponse> {
  return request<ForecastResponse>(`/api/forecast?scenario_key=${encodeURIComponent(scenarioKey(scenario))}`);
}

export function fetchDrainage(): Promise<FeatureCollection> {
  return request<FeatureCollection>("/api/drainage");
}

export function fetchCriticalInfrastructure(): Promise<FeatureCollection> {
  return request<FeatureCollection>("/api/critical-infrastructure");
}

export function fetchMapContext(): Promise<FeatureCollection> {
  return request<FeatureCollection>("/api/map-context");
}

export function fetchPilotBoundary(): Promise<FeatureCollection> {
  return request<FeatureCollection>("/api/pilot-boundary");
}

export function fetchRoute(payload: RouteRequest): Promise<RouteResponse> {
  return request<RouteResponse>("/api/route", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchDataStatus(): Promise<DataStatusResponse> {
  return request<DataStatusResponse>("/api/data-status");
}
