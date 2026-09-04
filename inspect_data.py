import geopandas as gpd
import fiona
from pathlib import Path

GPKG_FILE = Path("data/raw/roads/chennai_roads_bbbike.gpkg")

print("\n========== FILE CHECK ==========\n")
print("File exists:", GPKG_FILE.exists())

if not GPKG_FILE.exists():
    print("\nERROR: File not found.")
    raise SystemExit

print("\n========== ALL LAYERS ==========\n")

layers = fiona.listlayers(GPKG_FILE)

for layer in layers:
    print("-", layer)

print("\n========== INSPECTING LINES LAYER ==========\n")

roads = gpd.read_file(
    GPKG_FILE,
    layer="lines"
)

print("Layer: lines")
print("Number of features:", len(roads))
print("CRS:", roads.crs)

print("\nColumns:")

for column in roads.columns:
    print("-", column)

print("\nGeometry types:")
print(roads.geometry.geom_type.value_counts())

print("\nFirst 10 rows:")
print(roads.head(10).to_string())