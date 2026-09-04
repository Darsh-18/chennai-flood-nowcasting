import geopandas as gpd
from pathlib import Path

INPUT_FILE = "data/processed/roads/roads_clean.gpkg"
OUTPUT_DIR = Path("data/processed/roads")
OUTPUT_FILE = OUTPUT_DIR / "road_intersections.gpkg"

print("\n========== LOADING ROADS ==========\n")

roads = gpd.read_file(INPUT_FILE, layer="roads")

print("Roads loaded:", len(roads))
print("CRS:", roads.crs)

print("\n========== FINDING INTERSECTIONS ==========\n")

intersection_points = []

# Use GeoPandas spatial index instead of comparing every road
spatial_index = roads.sindex

for i, road in enumerate(roads.geometry):

    if i % 5000 == 0:
        print("Processed:", i, "/", len(roads))

    # Find roads whose bounding boxes overlap
    possible_matches = spatial_index.query(road, predicate="intersects")

    for j in possible_matches:

        # Don't compare a road with itself
        if i >= j:
            continue

        other_road = roads.geometry.iloc[j]

        intersection = road.intersection(other_road)

        if intersection.is_empty:
            continue

        if intersection.geom_type == "Point":
            intersection_points.append(intersection)

        elif intersection.geom_type == "MultiPoint":
            intersection_points.extend(list(intersection.geoms))


print("\nIntersections found:", len(intersection_points))

print("\n========== SAVING INTERSECTIONS ==========\n")

if intersection_points:

    intersections = gpd.GeoDataFrame(
        {"geometry": intersection_points},
        crs=roads.crs
    )

    # Remove duplicate intersection points
    intersections["x"] = intersections.geometry.x
    intersections["y"] = intersections.geometry.y

    intersections = intersections.drop_duplicates(
        subset=["x", "y"]
    )

    intersections = intersections.drop(
        columns=["x", "y"]
    )

    print("Unique intersections:", len(intersections))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    intersections.to_file(
        OUTPUT_FILE,
        layer="intersections",
        driver="GPKG"
    )

    print("Saved to:", OUTPUT_FILE)

else:
    print("No intersections found.")

print("\n========== COMPLETE ==========\n")