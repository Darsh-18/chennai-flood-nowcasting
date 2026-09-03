from __future__ import annotations

import math
from typing import Any

import networkx as nx


def _node(coord: list[float]) -> tuple[float, float]:
    return (round(float(coord[0]), 6), round(float(coord[1]), 6))


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lon1, lat1 = a
    lon2, lat2 = b
    radius_km = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    h = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * radius_km * math.asin(math.sqrt(h))


def build_graph(roads_geojson: dict[str, Any]) -> nx.Graph:
    graph = nx.Graph()
    for feature in roads_geojson.get("features", []):
        props = feature.get("properties", {})
        coords = feature.get("geometry", {}).get("coordinates", [])
        if len(coords) < 2:
            continue
        start = _node(coords[0])
        end = _node(coords[-1])
        distance = haversine_km(start, end)
        graph.add_node(start, lon=start[0], lat=start[1])
        graph.add_node(end, lon=end[0], lat=end[1])
        graph.add_edge(
            start,
            end,
            distance_km=distance,
            road_id=props.get("road_id"),
            name=props.get("name"),
            geometry=feature.get("geometry"),
        )
    return graph


def nearest_node(graph: nx.Graph, point: list[float]) -> tuple[float, float]:
    target = _node(point)
    return min(graph.nodes, key=lambda node: haversine_km(node, target))
