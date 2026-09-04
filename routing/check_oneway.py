import geopandas as gpd

FILE = "data/processed/roads/roads_clean.gpkg"

roads = gpd.read_file(FILE, layer="roads")

print("\n========== ONEWAY CHECK ==========\n")

print("Total roads:", len(roads))

oneway_yes = roads["other_tags"].fillna("").str.contains('"oneway"=>"yes"')

oneway_no = roads["other_tags"].fillna("").str.contains('"oneway"=>"no"')

print("One-way roads:", oneway_yes.sum())
print("Explicit two-way roads:", oneway_no.sum())
print("Other/unknown:", len(roads) - oneway_yes.sum() - oneway_no.sum())

print("\nSample one-way roads:")
print(
    roads.loc[
        oneway_yes,
        ["osm_id", "name", "highway", "other_tags"]
    ].head(10).to_string(index=False)
)