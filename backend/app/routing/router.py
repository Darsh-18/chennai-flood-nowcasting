from __future__ import annotations

from typing import Any

import networkx as nx

from app.models.schemas import RoadSegment, RoutePath, RouteResponse
from app.routing.graph_builder import build_graph, haversine_km, nearest_node
from app.simulation.constants import RISK_ORDER

RISK_WEIGHT = {
    "safe": 1.0,
    "watch": 1.35,
    "likely": 4.0,
    "severe": 12.0,
}

RISK_SPEED_KMH = {
    "safe": 28.0,
    "watch": 20.0,
    "likely": 10.0,
    "severe": 4.0,
}


def _infra_lookup(critical_geojson: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        feature.get("properties", {}).get("infra_id"): feature
        for feature in critical_geojson.get("features", [])
        if feature.get("properties", {}).get("infra_id")
    }


def _path_geometry(path_nodes: list[tuple[float, float]]) -> dict[str, Any]:
    return {
        "type": "LineString",
        "coordinates": [[lon, lat] for lon, lat in path_nodes],
    }


def _edge_risk(
    graph: nx.Graph,
    a: tuple[float, float],
    b: tuple[float, float],
    risk_by_road: dict[str, RoadSegment],
) -> str:
    road_id = graph.edges[a, b].get("road_id")
    road = risk_by_road.get(road_id)
    return road.risk_level if road else "safe"


def _route_summary(
    graph: nx.Graph,
    path_nodes: list[tuple[float, float]],
    risk_by_road: dict[str, RoadSegment],
    flood_adjust_eta: bool,
) -> RoutePath:
    distance = 0.0
    eta_hours = 0.0
    for a, b in zip(path_nodes, path_nodes[1:]):
        edge_distance = float(graph.edges[a, b].get("distance_km", haversine_km(a, b)))
        risk = _edge_risk(graph, a, b, risk_by_road)
        speed = RISK_SPEED_KMH[risk] if flood_adjust_eta else 28.0
        distance += edge_distance
        eta_hours += edge_distance / speed
    return RoutePath(
        path=_path_geometry(path_nodes),
        distance_km=round(distance, 2),
        eta_min=round(eta_hours * 60, 1),
    )


def _flood_weight(
    graph: nx.Graph,
    risk_by_road: dict[str, RoadSegment],
    a: tuple[float, float],
    b: tuple[float, float],
    attrs: dict[str, Any],
) -> float:
    risk = _edge_risk(graph, a, b, risk_by_road)
    return float(attrs.get("distance_km", 1.0)) * RISK_WEIGHT[risk]


def _intersected_risks(
    graph: nx.Graph,
    path_nodes: list[tuple[float, float]],
    risk_by_road: dict[str, RoadSegment],
) -> list[RoadSegment]:
    risky: list[RoadSegment] = []
    for a, b in zip(path_nodes, path_nodes[1:]):
        road_id = graph.edges[a, b].get("road_id")
        road = risk_by_road.get(road_id)
        if road and RISK_ORDER[road.risk_level] >= RISK_ORDER["likely"]:
            risky.append(road)
    return risky


def calculate_routes(
    roads_geojson: dict[str, Any],
    critical_geojson: dict[str, Any],
    road_state: list[RoadSegment],
    start_infra_id: str,
    end_infra_id: str,
) -> RouteResponse:
    graph = build_graph(roads_geojson)
    infra = _infra_lookup(critical_geojson)
    if start_infra_id not in infra or end_infra_id not in infra:
        raise ValueError("Unknown critical infrastructure id")
    if start_infra_id == end_infra_id:
        raise ValueError("Start and destination must differ")

    start_coord = infra[start_infra_id]["geometry"]["coordinates"]
    end_coord = infra[end_infra_id]["geometry"]["coordinates"]
    source = nearest_node(graph, start_coord)
    target = nearest_node(graph, end_coord)
    risk_by_road = {road.road_id: road for road in road_state}

    try:
        normal_nodes = nx.shortest_path(graph, source, target, weight="distance_km")
    except nx.NetworkXNoPath:
        empty = RoutePath(path={"type": "LineString", "coordinates": []}, distance_km=0.0, eta_min=0.0)
        return RouteResponse(
            normal_route=empty,
            flood_aware_route=empty,
            explanation="No feasible route was found in the demo road graph under the selected endpoints.",
        )

    normal_route = _route_summary(graph, normal_nodes, risk_by_road, flood_adjust_eta=False)

    try:
        flood_nodes = nx.shortest_path(
            graph,
            source,
            target,
            weight=lambda a, b, attrs: _flood_weight(graph, risk_by_road, a, b, attrs),
        )
    except nx.NetworkXNoPath:
        flood_nodes = normal_nodes

    flood_route = _route_summary(graph, flood_nodes, risk_by_road, flood_adjust_eta=True)
    risky_roads = _intersected_risks(graph, normal_nodes, risk_by_road)
    if risky_roads and normal_route.path != flood_route.path:
        worst = max(risky_roads, key=lambda road: RISK_ORDER[road.risk_level])
        explanation = (
            f"Original route intersects {worst.name}, which is in the {worst.depth_band} band for the selected horizon. "
            "The flood-aware route adds a weighted detour around predicted high-risk segments."
        )
    elif risky_roads:
        worst = max(risky_roads, key=lambda road: RISK_ORDER[road.risk_level])
        explanation = (
            f"Original route intersects {worst.name}, which is in the {worst.depth_band} band. "
            "No lower-risk detour is shorter in this demo network, so the same alignment is retained with slower ETA."
        )
    else:
        explanation = "Normal and flood-aware routes are similar because the selected path avoids likely and severe road-risk bands."

    return RouteResponse(
        normal_route=normal_route,
        flood_aware_route=flood_route,
        explanation=explanation,
    )
