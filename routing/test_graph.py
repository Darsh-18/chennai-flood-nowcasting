import pickle
import networkx as nx

GRAPH_FILE = "data/processed/roads/road_graph.pkl"

print("\n========== LOADING GRAPH ==========\n")

with open(GRAPH_FILE, "rb") as f:
    graph = pickle.load(f)

print("Nodes:", graph.number_of_nodes())
print("Edges:", graph.number_of_edges())

print("\n========== GRAPH TYPE ==========\n")
print(type(graph))

print("\n========== CONNECTIVITY ==========\n")

components = list(nx.connected_components(graph))

print("Number of connected components:", len(components))

largest_component = max(components, key=len)

print("Largest component:", len(largest_component), "nodes")

print("\n========== SAMPLE EDGE ==========\n")

u, v, data = next(iter(graph.edges(data=True)))

print("From:", u)
print("To:", v)

print("Edge attributes:")

for key, value in data.items():
    print(f"  {key}: {value}")

print("\n========== TEST COMPLETE ==========\n")