from __future__ import annotations

from typing import Protocol

from app.data_access.loader import load_json_file


class RainfallAdapter(Protocol):
    def get_rainfall_scenarios(self) -> dict:
        ...


class DemoRainfallAdapter:
    def get_rainfall_scenarios(self) -> dict:
        return load_json_file("rainfall_scenarios.json")


class LiveRainfallAdapter:
    def get_rainfall_scenarios(self) -> dict:
        raise RuntimeError("LIVE rainfall adapter is unconfigured for this prototype")
