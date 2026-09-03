from __future__ import annotations

SEED = "SIH26085_CHENNAI_DEMO_SEED"

DEFAULT_PARAMS = {
    "runoff_coefficient": 0.82,
    "time_step_hours": 0.5,
    "downstream_share": 0.28,
}

DRAINAGE_MULTIPLIERS = {
    "normal": 1.0,
    "degraded": 0.6,
    "severe": 0.3,
}

DEPTH_THRESHOLDS_CM = {
    "0-10cm": (0.0, 10.0),
    "10-30cm": (10.0, 30.0),
    "30-60cm": (30.0, 60.0),
    ">60cm": (60.0, float("inf")),
}

RISK_BY_DEPTH_BAND = {
    "0-10cm": "safe",
    "10-30cm": "watch",
    "30-60cm": "likely",
    ">60cm": "severe",
}

RISK_ORDER = {
    "safe": 0,
    "watch": 1,
    "likely": 2,
    "severe": 3,
}

TIMELINE_CHECKPOINTS = {
    0: "NOW",
    30: "T+30",
    60: "T+60",
    120: "T+120",
    180: "T+180",
}

FORECAST_STEPS = [30, 60, 120, 180]
