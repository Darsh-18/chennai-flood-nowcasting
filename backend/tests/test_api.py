from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_scenario_router_returns_options() -> None:
    response = client.get("/api/scenario")
    assert response.status_code == 200
    assert response.json()["default"]["forecast_minutes"] == 60


def test_nowcast_router_returns_computed_cells() -> None:
    response = client.post(
        "/api/nowcast",
        json={"rainfall_intensity": "heavy", "drainage_condition": "normal", "forecast_minutes": 60},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["model_label"] == "Reduced-order demonstration model"
    assert len(body["flood_cells"]) == 36
    assert body["kpis"]["affected_road_count"] >= 0


def test_flood_state_router_returns_cells_for_key() -> None:
    response = client.get("/api/flood-state", params={"scenario_key": "heavy:normal:60"})
    assert response.status_code == 200
    assert response.json()["flood_cells"][0]["depth_band"] in {"0-10cm", "10-30cm", "30-60cm", ">60cm"}


def test_forecast_router_returns_timeline_sequence() -> None:
    response = client.get("/api/forecast", params={"scenario_key": "heavy:normal:60"})
    assert response.status_code == 200
    steps = response.json()["steps"]
    assert [step["label"] for step in steps] == ["NOW", "T+30", "T+60", "T+120", "T+180"]


def test_drainage_router_returns_feature_collection() -> None:
    response = client.get("/api/drainage")
    assert response.status_code == 200
    assert response.json()["type"] == "FeatureCollection"
    assert response.json()["features"]


def test_route_router_returns_normal_and_flood_aware_paths() -> None:
    response = client.post(
        "/api/route",
        json={
            "start_infra_id": "hospital-north",
            "end_infra_id": "relief-center-south",
            "scenario": {
                "rainfall_intensity": "heavy",
                "drainage_condition": "severe",
                "forecast_minutes": 60,
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["normal_route"]["path"]["coordinates"]
    assert body["flood_aware_route"]["path"]["coordinates"]
    assert body["simulated_label"] == "Simulated routing scenario"


def test_data_status_router_returns_honesty_labels() -> None:
    response = client.get("/api/data-status")
    assert response.status_code == 200
    classifications = {layer["classification"] for layer in response.json()["layers"]}
    assert {"OBSERVED", "DERIVED", "INFERRED", "SIMULATED"}.issubset(classifications)


def test_critical_infrastructure_router_returns_three_nodes() -> None:
    response = client.get("/api/critical-infrastructure")
    assert response.status_code == 200
    assert len(response.json()["features"]) == 3


def test_health_router_returns_demo_mode() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["mode"] == "DEMO"


def test_map_layers_router_returns_context_and_boundary() -> None:
    context = client.get("/api/map-context")
    boundary = client.get("/api/pilot-boundary")
    assert context.status_code == 200
    assert boundary.status_code == 200
    assert context.json()["features"]
    assert boundary.json()["features"][0]["properties"]["name"] == "Pilot Zone (illustrative boundary)"
