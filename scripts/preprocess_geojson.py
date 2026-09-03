"""Example design-time converter for KML/SHP inputs into GeoJSON.

The demo does not require real municipal inputs. If future data owners provide
official layers, this script shows the intended preprocessing boundary.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import geopandas as gpd


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert a GIS source file to WGS84 GeoJSON.")
    parser.add_argument("input_path", type=Path)
    parser.add_argument("output_path", type=Path)
    args = parser.parse_args()

    frame = gpd.read_file(args.input_path)
    frame = frame.to_crs("EPSG:4326")
    args.output_path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_file(args.output_path, driver="GeoJSON")


if __name__ == "__main__":
    main()
