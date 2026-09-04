import pickle
import networkx as nx

GRAPH_FILE = "data/processed/roads/routing_graph.pkl"

print("\n========== LOADING GRAPH ==========\n")

with open(GRAPH_FILE, "rb") as f:
    graph = pickle.load(f)

print("Nodes:", graph.number_of_nodes())
print("Edges:", graph.number_of_edges())

print("\n========== FINDING LARGEST COMPONENT ==========\n")

components = list(nx.connected_components(graph))

largest = max(components, key=len)

print("Largest component:", len(largest), "nodes")

# Pick two nodes from the largest connected component
nodes = list(largest)

start_node = nodes[0]
end_node = nodes[-1]

print("\nStart node:", start_node)
print("End node:", end_node)

print("\n========== FINDING ROUTE ==========\n")

route = nx.shortest_path(
    graph,
    start_node,
    end_node,
    weight="length_m"
)

distance = nx.shortest_path_length(
    graph,
    start_node,
    end_node,
    weight="length_m"
)

print("Route found!")
print("Number of nodes:", len(route))
print("Distance:", distance, "metres")

print("\nFirst 5 nodes:")
print(route[:5])

print("\nLast 5 nodes:")
print(route[-5:])

print("\n========== COMPLETE ==========\n")