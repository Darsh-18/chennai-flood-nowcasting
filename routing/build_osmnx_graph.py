import geopandas as gpd
import osmnx as ox
from pathlib import Path

INPUT_FILE = "data/raw/roads/chennai_roads_bbbike.gpkg"
OUTPUT_DIR = Path("data/processed/roads")
OUTPUT_FILE = OUTPUT_DIR / "chennai_osmnx.graphml"

print("\n========== LOADING OSM DATA ==========\n")

# Load the OSM road layer
roads = gpd.read_file(
    INPUT_FILE,
    layer="lines"
)

print("Total features:", len(roads))
print("CRS:", roads.crs)

# Keep only actual road features
roads = roads[roads["highway"].notna()].copy()

# Remove empty/invalid geometry
roads = roads[roads.geometry.notna()].copy()
roads = roads[~roads.geometry.is_empty].copy()
roads = roads[roads.geometry.is_valid].copy()

print("Road features:", len(roads))

print("\n========== PREPARING ROAD DATA ==========\n")

# OSMnx expects longitude/latitude for the initial graph construction.
roads = roads.to_crs("EPSG:4326")

# Create a unique ID for every road feature
roads["edge_id"] = range(len(roads))

print("Road data prepared.")

print("\n========== BUILDING GRAPH ==========\n")

# Build a graph from the road geometries.
# We first create a directed graph so one-way information can be retained.
graph = ox.convert.graph_from_gdfs(
    gdf_nodes=gpd.GeoDataFrame(
        {
            "osmid": range(len(roads))
        },
        geometry=roads.geometry.apply(lambda g: g.coords[0]),
        crs=roads.crs
    ),
    gdf_edges=roads
)

print("Graph created.")

print("Nodes:", graph.number_of_nodes())
print("Edges:", graph.number_of_edges())

print("\n========== SAVING GRAPH ==========\n")

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)

ox.io.save_graphml(
    graph,
    filepath=OUTPUT_FILE
)

print("Graph saved to:")
print(OUTPUT_FILE)

print("\n========== COMPLETE ==========\n")