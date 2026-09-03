from __future__ import annotations

from typing import Protocol

from app.data_access.loader import load_feature_collection


class DrainageAdapter(Protocol):
    def get_drainage_network(self) -> dict:
        ...


class DemoDrainageAdapter:
    def get_drainage_network(self) -> dict:
        return load_feature_collection("drainage_network.geojson")


class LiveDrainageAdapter:
    def get_drainage_network(self) -> dict:
        raise RuntimeError("LIVE drainage adapter is unconfigured for this prototype")
