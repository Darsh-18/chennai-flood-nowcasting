from __future__ import annotations

from typing import Protocol

from app.data_access.loader import load_json_file


class DemAdapter(Protocol):
    def get_dem_proxy(self) -> dict:
        ...


class DemoDemAdapter:
    def get_dem_proxy(self) -> dict:
        return load_json_file("dem_proxy.json")


class LiveDemAdapter:
    def get_dem_proxy(self) -> dict:
        raise RuntimeError("LIVE DEM adapter is unconfigured for this prototype")
