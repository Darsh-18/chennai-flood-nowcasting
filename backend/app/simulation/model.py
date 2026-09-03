"""Reduced-order demonstration model. Not a validated hydrological/hydraulic model. Coefficients are illustrative and tuned only to produce a plausible, explainable demo response."""

from __future__ import annotations

import hashlib
from copy import deepcopy
from typing import Any

import numpy as np

from app.models.schemas import AlertSummary, FloodCell, KpiSummary, RoadSegment, Scenario
from app.simulation.constants import (
    DEFAULT_PARAMS,
    DEPTH_THRESHOLDS_CM,
    DRAINAGE_MULTIPLIERS,
    RISK_BY_DEPTH_BAND,
    RISK_ORDER,
    SEED,
    TIMELINE_CHECKPOINTS,
)
from app.simulation.grid import get_cells, get_zone_area_km2


def stable_seed(*parts: str | int) -> str:
    joined = "|".join([SEED, *[str(part) for part in parts]])
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()[:12]


def deterministic_variation(seed_key: str, cell_id: str) -> float:
    digest = hashlib.sha256(f"{seed_key}:{cell_id}".encode("utf-8")).hexdigest()
    value = int(digest[:6], 16) / 0xFFFFFF
    return 0.96 + (value * 0.08)


def confidence_for_horizon(forecast_minutes: int) -> str:
    if forecast_minutes <= 30:
        return "High"
    if forecast_minutes <= 60:
        return "Moderate"
    return "Low"


def bucket_depth(accumulated_water_cm: float) -> str:
    for band, (low, high) in DEPTH_THRESHOLDS_CM.items():
        if low <= accumulated_water_cm < high:
            return band
    return ">60cm"


def derive_risk(depth_band: str, confidence: str) -> str:
    return RISK_BY_DEPTH_BAND[depth_band]


def _rainfall_score(intensity: str) -> float:
    return {"moderate": 0.42, "heavy": 0.74, "extreme": 1.0}[intensity]


def _primary_cause(
    rainfall_intensity: str,
    drainage_stress_score: float,
    terrain_accumulation_score: float,
) -> str:
    scores = {
        "Rainfall intensity": _rainfall_score(rainfall_intensity),
        "Drainage stress": min(1.0, drainage_stress_score / 1.55),
        "Terrain accumulation": min(1.0, terrain_accumulation_score),
    }
    return max(scores.items(), key=lambda item: item[1])[0]


def _empty_cell(cell: dict[str, Any], forecast_minutes: int) -> FloodCell:
    return FloodCell(
        cell_id=cell["cell_id"],
        centroid_lat=cell["centroid"][1],
        centroid_lon=cell["centroid"][0],
        depth_band="0-10cm",
        confidence=confidence_for_horizon(forecast_minutes),
        risk_level="safe",
        geometry=cell.get("geometry"),
        drivers={
            "rainfall": {"classification": "OBSERVED", "level": "no active demo accumulation"},
            "runoff": {"classification": "DERIVED", "score": 0.0},
            "drainage_stress": {"classification": "SIMULATED SCENARIO", "score": 0.0},
            "terrain_accumulation": {
                "classification": "INFERRED",
                "score": round(float(cell.get("accumulation_factor", 1.0)), 2),
            },
            "primary_cause": "No elevated driver",
        },
    )


def _cell_to_flood_cell(
    cell: dict[str, Any],
    accumulated_cm: float,
    drivers: dict[str, Any],
    forecast_minutes: int,
) -> FloodCell:
    depth_band = bucket_depth(accumulated_cm)
    confidence = confidence_for_horizon(forecast_minutes)
    return FloodCell(
        cell_id=cell["cell_id"],
        centroid_lat=cell["centroid"][1],
        centroid_lon=cell["centroid"][0],
        depth_band=depth_band,
        confidence=confidence,
        risk_level=derive_risk(depth_band, confidence),
        drivers=drivers,
        geometry=cell.get("geometry"),
    )


def _road_segments_from_cells(
    roads_geojson: dict[str, Any],
    cells_by_id: dict[str, FloodCell],
) -> list[RoadSegment]:
    segments: list[RoadSegment] = []
    for feature in roads_geojson.get("features", []):
        props = feature.get("properties", {})
        road_id = props.get("road_id", "road")
        name = props.get("name", road_id)
        cell_ids = props.get("cell_ids", [])
        relevant = [cells_by_id[cell_id] for cell_id in cell_ids if cell_id in cells_by_id]
        if relevant:
            worst = max(relevant, key=lambda cell: RISK_ORDER[cell.risk_level])
            risk_level = worst.risk_level
            depth_band = worst.depth_band
        else:
            risk_level = "safe"
            depth_band = "0-10cm"
        segments.append(
            RoadSegment(
                road_id=road_id,
                name=name,
                geometry=feature.get("geometry", {"type": "LineString", "coordinates": []}),
                risk_level=risk_level,
                depth_band=depth_band,
                passable=risk_level != "severe",
            )
        )
    return segments


def _kpis(
    flood_cells: list[FloodCell],
    roads: list[RoadSegment],
    zone_area_km2: float,
    forecast_minutes: int,
) -> KpiSummary:
    affected_cell_count = sum(1 for cell in flood_cells if cell.risk_level != "safe")
    affected_area = (zone_area_km2 / max(len(flood_cells), 1)) * affected_cell_count
    affected_roads = sum(1 for road in roads if road.risk_level != "safe")
    worst_risk = max([cell.risk_level for cell in flood_cells], key=lambda risk: RISK_ORDER[risk], default="safe")
    flood_label = {
        "safe": "No elevated flood pockets",
        "watch": "Watch-level flooding possible",
        "likely": "Likely flood pockets",
        "severe": "Severe flood pockets possible",
    }[worst_risk]
    return KpiSummary(
        flood_risk=flood_label,
        affected_area_km2=round(affected_area, 2),
        affected_road_count=affected_roads,
        forecast_label=TIMELINE_CHECKPOINTS.get(forecast_minutes, f"T+{forecast_minutes}"),
        overall_confidence=confidence_for_horizon(forecast_minutes),
    )


def _alert(kpis: KpiSummary, scenario: Scenario) -> AlertSummary:
    if kpis.affected_road_count == 0:
        return AlertSummary(
            headline="Prototype nowcast: low surface-flood signal",
            detail=f"{kpis.forecast_label} remains mostly within the 0-10cm band under the selected simulated scenario.",
            recommended_action="Continue monitoring the timeline and keep drainage degradation controls visible for what-if discussion.",
        )
    if "Severe" in kpis.flood_risk:
        return AlertSummary(
            headline="Illustrative output: severe pockets possible",
            detail=f"{kpis.affected_road_count} demo road segments intersect high-risk cells by {kpis.forecast_label}.",
            recommended_action="Prioritize route checks near high-risk cells and stage response from safer critical-infrastructure nodes.",
        )
    if "Likely" in kpis.flood_risk:
        return AlertSummary(
            headline="Illustrative output: likely flood pockets",
            detail=f"{scenario.rainfall_intensity.title()} rainfall with {scenario.drainage_condition} drainage raises runoff and road-impact indicators.",
            recommended_action="Use the routing panel to compare the normal route against the flood-aware route before dispatch.",
        )
    return AlertSummary(
        headline="Prototype nowcast: watch conditions",
        detail=f"{kpis.affected_area_km2:.2f} km2 of the illustrative pilot zone crosses the watch band.",
        recommended_action="Track the T+60 to T+180 confidence shift and prepare local field verification.",
    )


def _snapshot(
    cells: list[dict[str, Any]],
    roads_geojson: dict[str, Any],
    accumulated: dict[str, float],
    drivers_by_cell: dict[str, dict[str, Any]],
    zone_area_km2: float,
    forecast_minutes: int,
    scenario: Scenario,
) -> dict[str, Any]:
    flood_cells = [
        _cell_to_flood_cell(cell, accumulated[cell["cell_id"]], drivers_by_cell[cell["cell_id"]], forecast_minutes)
        for cell in cells
    ]
    roads = _road_segments_from_cells(roads_geojson, {cell.cell_id: cell for cell in flood_cells})
    kpis = _kpis(flood_cells, roads, zone_area_km2, forecast_minutes)
    return {
        "flood_cells": flood_cells,
        "affected_roads": roads,
        "kpis": kpis,
        "alert": _alert(kpis, scenario),
    }


def run_forecast_sequence(
    scenario_base: Scenario,
    rainfall_scenarios: dict[str, Any],
    dem_proxy: dict[str, Any],
    roads_geojson: dict[str, Any],
) -> dict[int, dict[str, Any]]:
    cells = get_cells(dem_proxy)
    zone_area = get_zone_area_km2(dem_proxy)
    cells_by_id = {cell["cell_id"]: cell for cell in cells}
    rainfall_series = (
        rainfall_scenarios.get(scenario_base.rainfall_intensity, {}).get("series_mm_hr")
        or rainfall_scenarios.get("moderate", {}).get("series_mm_hr")
        or [0, 0, 0, 0, 0, 0]
    )
    seed_key = stable_seed(scenario_base.rainfall_intensity, scenario_base.drainage_condition)
    accumulated = {cell["cell_id"]: 0.0 for cell in cells}
    drivers_by_cell = {cell["cell_id"]: _empty_cell(cell, 0).drivers for cell in cells}
    snapshots: dict[int, dict[str, Any]] = {
        0: _snapshot(cells, roads_geojson, accumulated, drivers_by_cell, zone_area, 0, scenario_base)
    }

    runoff_coefficient = float(DEFAULT_PARAMS["runoff_coefficient"])
    time_step_hours = float(DEFAULT_PARAMS["time_step_hours"])
    downstream_share = float(DEFAULT_PARAMS["downstream_share"])
    current_share = 1.0 - downstream_share
    degradation_multiplier = DRAINAGE_MULTIPLIERS[scenario_base.drainage_condition]
    max_accumulation = max((float(cell.get("accumulation_factor", 1.0)) for cell in cells), default=1.0)

    step_to_horizon = {1: 30, 2: 60, 4: 120, 6: 180}
    for step_index in range(1, 7):
        rainfall_mm_hr = float(rainfall_series[min(step_index - 1, len(rainfall_series) - 1)])
        downstream_delta = {cell["cell_id"]: 0.0 for cell in cells}
        local_delta = {cell["cell_id"]: 0.0 for cell in cells}

        for cell in cells:
            cell_id = cell["cell_id"]
            terrain_factor = float(cell.get("terrain_factor", 1.0))
            accumulation_factor = float(cell.get("accumulation_factor", 1.0))
            base_capacity = float(cell.get("base_drainage_capacity_cm_per_step", 1.0))
            variation = deterministic_variation(seed_key, cell_id)
            rainfall_cm = rainfall_mm_hr * time_step_hours / 10.0
            effective_runoff = rainfall_cm * runoff_coefficient * terrain_factor * variation
            effective_capacity = base_capacity * degradation_multiplier
            excess = max(0.0, effective_runoff - effective_capacity)
            gain = excess * accumulation_factor
            local_delta[cell_id] += gain * current_share
            downstream_id = cell.get("downstream_cell_id")
            if downstream_id in downstream_delta:
                downstream_delta[downstream_id] += gain * downstream_share

            drainage_stress = effective_runoff / max(effective_capacity, 0.05)
            terrain_score = accumulation_factor / max_accumulation
            primary_cause = _primary_cause(scenario_base.rainfall_intensity, drainage_stress, terrain_score)
            drivers_by_cell[cell_id] = {
                "rainfall": {
                    "classification": "OBSERVED",
                    "level": scenario_base.rainfall_intensity,
                    "rainfall_mm_hr": round(rainfall_mm_hr, 1),
                },
                "runoff": {
                    "classification": "DERIVED",
                    "score_cm": round(effective_runoff, 2),
                    "coefficient": runoff_coefficient,
                },
                "drainage_stress": {
                    "classification": "SIMULATED SCENARIO",
                    "condition": scenario_base.drainage_condition,
                    "score": round(drainage_stress, 2),
                },
                "terrain_accumulation": {
                    "classification": "INFERRED",
                    "score": round(terrain_score, 2),
                    "elevation_proxy_m": round(float(cell.get("elevation_proxy_m", 0.0)), 2),
                },
                "primary_cause": primary_cause,
            }

        for cell_id in accumulated:
            accumulated[cell_id] += local_delta[cell_id] + downstream_delta[cell_id]

        if step_index in step_to_horizon:
            horizon = step_to_horizon[step_index]
            snapshot_scenario = Scenario(
                rainfall_intensity=scenario_base.rainfall_intensity,
                drainage_condition=scenario_base.drainage_condition,
                forecast_minutes=horizon,
            )
            snapshots[horizon] = _snapshot(
                cells,
                roads_geojson,
                deepcopy(accumulated),
                deepcopy(drivers_by_cell),
                zone_area,
                horizon,
                snapshot_scenario,
            )

    return snapshots


def count_risk_cells(flood_cells: list[FloodCell], risk_level: str) -> int:
    return int(np.sum([cell.risk_level == risk_level for cell in flood_cells]))
