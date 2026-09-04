import geopandas as gpd
import networkx as nx
import momepy
import pickle

INPUT_FILE = "data/processed/roads/roads_split.gpkg"
OUTPUT_FILE = "data/processed/roads/road_graph.pkl"

print("\n========== LOADING CLEAN ROADS ==========\n")

roads = gpd.read_file(INPUT_FILE, layer="roads")

print("Roads loaded:", len(roads))
print("CRS:", roads.crs)

print("\n========== BUILDING GRAPH ==========\n")

graph = momepy.gdf_to_nx(
    roads,
    approach="primal",
    length="length_m",
    directed=False
)

print("Nodes:", graph.number_of_nodes())
print("Edges:", graph.number_of_edges())

print("\n========== SAVING GRAPH ==========\n")

with open(OUTPUT_FILE, "wb") as f:
    pickle.dump(graph, f)

print("Graph saved to:", OUTPUT_FILE)

print("\n========== GRAPH COMPLETE ==========\n")