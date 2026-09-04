import geopandas as gpd
import networkx as nx
import pickle
from pathlib import Path

INPUT_FILE = "data/processed/roads/roads_split.gpkg"
OUTPUT_FILE = "data/processed/roads/routing_graph.pkl"

print("\n========== LOADING SPLIT ROADS ==========\n")

roads = gpd.read_file(
    INPUT_FILE,
    layer="roads"
)

print("Road segments:", len(roads))
print("CRS:", roads.crs)

print("\n========== BUILDING ROUTING GRAPH ==========\n")

graph = nx.MultiGraph()

for i, road in enumerate(roads.itertuples()):

    if i % 10000 == 0:
        print("Processed:", i, "/", len(roads))

    geometry = road.geometry

    if geometry is None:
        continue

    if geometry.is_empty:
        continue

    # Start and end coordinates of this road segment
    start = tuple(geometry.coords[0])
    end = tuple(geometry.coords[-1])

    # Add nodes
    graph.add_node(
        start,
        x=start[0],
        y=start[1]
    )

    graph.add_node(
        end,
        x=end[0],
        y=end[1]
    )

    # Add road segment as an edge
    graph.add_edge(
        start,
        end,
        length_m=float(road.length_m),
        osm_id=road.osm_id,
        name=road.name,
        highway=road.highway,
        other_tags=road.other_tags,
        geometry=geometry
    )

print("\n========== GRAPH CREATED ==========\n")

print("Nodes:", graph.number_of_nodes())
print("Edges:", graph.number_of_edges())

print("\n========== CONNECTIVITY ==========\n")

components = list(nx.connected_components(graph))

print("Connected components:", len(components))

largest_component = max(
    components,
    key=len
)

print(
    "Largest component:",
    len(largest_component),
    "nodes"
)

print("\n========== SAVING GRAPH ==========\n")

Path(OUTPUT_FILE).parent.mkdir(
    parents=True,
    exist_ok=True
)

with open(OUTPUT_FILE, "wb") as f:
    pickle.dump(graph, f)

print("Graph saved to:")
print(OUTPUT_FILE)

print("\n========== COMPLETE ==========\n")