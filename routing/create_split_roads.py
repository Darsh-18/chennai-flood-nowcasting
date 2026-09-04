import geopandas as gpd
from shapely.geometry import Point
from shapely.ops import split
from pathlib import Path

ROADS_FILE = "data/processed/roads/roads_clean.gpkg"
INTERSECTIONS_FILE = "data/processed/roads/road_intersections.gpkg"

OUTPUT_DIR = Path("data/processed/roads")
OUTPUT_FILE = OUTPUT_DIR / "roads_split.gpkg"

print("\n========== LOADING DATA ==========\n")

roads = gpd.read_file(
    ROADS_FILE,
    layer="roads"
)

intersections = gpd.read_file(
    INTERSECTIONS_FILE,
    layer="intersections"
)

print("Roads:", len(roads))
print("Intersections:", len(intersections))

print("\n========== PREPARING SPATIAL INDEX ==========\n")

intersection_sindex = intersections.sindex

split_roads = []

print("\n========== SPLITTING ROADS ==========\n")

for i, road in enumerate(roads.itertuples()):

    if i % 5000 == 0:
        print("Processed:", i, "/", len(roads))

    geometry = road.geometry

    # Find nearby intersection points
    possible = intersection_sindex.query(
        geometry,
        predicate="intersects"
    )

    points = []

    for idx in possible:
        point = intersections.geometry.iloc[idx]

        if point.distance(geometry) < 0.01:
            points.append(point)

    # No intersections on this road
    if not points:
        split_roads.append(
            {
                "osm_id": road.osm_id,
                "name": road.name,
                "highway": road.highway,
                "waterway": road.waterway,
                "railway": road.railway,
                "z_order": road.z_order,
                "other_tags": road.other_tags,
                "length_m": road.length_m,
                "geometry": geometry,
            }
        )
        continue

    # Split road using intersection points
    result = geometry

    for point in points:

        try:
            if result.geom_type == "LineString":
                result = split(result, point)

        except Exception:
            pass

    # Store resulting segments
    if hasattr(result, "geoms"):

        for segment in result.geoms:

            if segment.length > 0.1:

                split_roads.append(
                    {
                        "osm_id": road.osm_id,
                        "name": road.name,
                        "highway": road.highway,
                        "waterway": road.waterway,
                        "railway": road.railway,
                        "z_order": road.z_order,
                        "other_tags": road.other_tags,
                        "length_m": segment.length,
                        "geometry": segment,
                    }
                )

    else:

        if result.length > 0.1:

            split_roads.append(
                {
                    "osm_id": road.osm_id,
                    "name": road.name,
                    "highway": road.highway,
                    "waterway": road.waterway,
                    "railway": road.railway,
                    "z_order": road.z_order,
                    "other_tags": road.other_tags,
                    "length_m": result.length,
                    "geometry": result,
                }
            )


print("\n========== CREATING OUTPUT ==========\n")

split_roads_gdf = gpd.GeoDataFrame(
    split_roads,
    crs=roads.crs
)

print("Original roads:", len(roads))
print("Split road segments:", len(split_roads_gdf))

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)

split_roads_gdf.to_file(
    OUTPUT_FILE,
    layer="roads",
    driver="GPKG"
)

print("\nSaved to:")
print(OUTPUT_FILE)

print("\n========== COMPLETE ==========\n")