import pickle
import networkx as nx
from shapely.geometry import LineString


GRAPH_FILE = "data/processed/roads/road_graph.pkl"


def load_graph():
    """Load the Chennai road graph."""
    with open(GRAPH_FILE, "rb") as f:
        graph = pickle.load(f)

    return graph


def find_nearest_node(graph, x, y):
    """Find the graph node closest to a coordinate."""

    nearest_node = min(
        graph.nodes,
        key=lambda node: (node[0] - x) ** 2 + (node[1] - y) ** 2
    )

    return nearest_node


def find_route(start_x, start_y, end_x, end_y):
    """Find the shortest road route between two coordinates."""

    graph = load_graph()

    start_node = find_nearest_node(
        graph,
        start_x,
        start_y
    )

    end_node = find_nearest_node(
        graph,
        end_x,
        end_y
    )

    print("Start node:", start_node)
    print("End node:", end_node)

    route_nodes = nx.shortest_path(
        graph,
        start_node,
        end_node,
        weight="length"
    )

    total_distance = nx.shortest_path_length(
        graph,
        start_node,
        end_node,
        weight="length"
    )

    return route_nodes, total_distance


if __name__ == "__main__":

    print("\n========== ROUTING TEST ==========\n")

    # Example coordinates in EPSG:32644
    start_x = 427000
    start_y = 1440000

    end_x = 435000
    end_y = 1450000

    route, distance = find_route(
        start_x,
        start_y,
        end_x,
        end_y
    )

    print("\nRoute found!")
    print("Number of nodes:", len(route))
    print("Distance:", distance, "metres")

    print("\nFirst 5 route nodes:")
    print(route[:5])

    print("\n========== ROUTING TEST COMPLETE ==========\n")