import geopandas as gpd
from pathlib import Path

INPUT_FILE = Path("data/raw/roads/chennai_roads_bbbike.gpkg")
OUTPUT_DIR = Path("data/processed/roads")
OUTPUT_FILE = OUTPUT_DIR / "roads_clean.gpkg"

print("\n========== LOADING ROADS ==========\n")

roads = gpd.read_file(
    INPUT_FILE,
    layer="lines"
)

print("Original roads:", len(roads))
print("CRS:", roads.crs)

# Keep only features that are actually roads
roads = roads[roads["highway"].notna()].copy()

print("After removing non-road features:", len(roads))

# Remove empty geometries
roads = roads[roads.geometry.notna()].copy()
roads = roads[~roads.geometry.is_empty].copy()

print("After removing empty geometries:", len(roads))

# Remove invalid geometries
roads = roads[roads.geometry.is_valid].copy()

print("After removing invalid geometries:", len(roads))

# Convert to a metric CRS for Chennai
roads = roads.to_crs("EPSG:32644")

# Calculate road length in metres
roads["length_m"] = roads.geometry.length

# Keep useful columns
roads = roads[
    [
        "osm_id",
        "name",
        "highway",
        "waterway",
        "railway",
        "z_order",
        "other_tags",
        "length_m",
        "geometry",
    ]
].copy()

# Create output directory
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Save cleaned roads
roads.to_file(
    OUTPUT_FILE,
    layer="roads",
    driver="GPKG"
)

print("\n========== CLEANING COMPLETE ==========\n")
print("Final road count:", len(roads))
print("CRS:", roads.crs)
print("Output:", OUTPUT_FILE)
print("\nHighway types:")
print(roads["highway"].value_counts().head(20))

print("\nLength statistics:")
print(roads["length_m"].describe())