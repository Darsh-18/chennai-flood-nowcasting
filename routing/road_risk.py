import geopandas as gpd
import pandas as pd


def classify_risk(depth_m):
    """
    Classify road flood risk from flood depth.

    These thresholds are project assumptions and can be
    changed when the team agrees on final thresholds.
    """

    if pd.isna(depth_m):
        return "SAFE"

    if depth_m <= 0.10:
        return "SAFE"

    elif depth_m <= 0.30:
        return "RISKY"

    else:
        return "BLOCKED"


def add_road_risk(roads, flood_depth_column="depth_m"):
    """
    Add flood depth and risk classification to road data.
    """

    roads = roads.copy()

    roads["flood_depth_m"] = roads[flood_depth_column]

    roads["risk"] = roads["flood_depth_m"].apply(
        classify_risk
    )

    return roads


if __name__ == "__main__":

    print("\n========== ROAD RISK ENGINE TEST ==========\n")

    test_depths = [
        0.00,
        0.05,
        0.10,
        0.15,
        0.30,
        0.40
    ]

    test_roads = pd.DataFrame({
        "road_id": range(1, len(test_depths) + 1),
        "depth_m": test_depths
    })

    result = add_road_risk(
        test_roads,
        "depth_m"
    )

    print(result.to_string(index=False))

    print("\n========== TEST COMPLETE ==========\n")