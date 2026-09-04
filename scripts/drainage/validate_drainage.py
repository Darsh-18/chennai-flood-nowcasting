from pathlib import Path
import geopandas as gpd


PROJECT_ROOT = Path(__file__).resolve().parents[2]

INPUT_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "drainage"
    / "chennai_swd.gpkg"
)


print("=" * 70)
print("CHENNAI STORMWATER DRAINAGE - GPKG VALIDATION")
print("=" * 70)

print(f"\nFile: {INPUT_FILE}")

if not INPUT_FILE.exists():
    print("\nERROR: GeoPackage not found.")
    raise SystemExit(1)


gdf = gpd.read_file(
    INPUT_FILE,
    layer="drains"
)


# ------------------------------------------------------------
# BASIC
# ------------------------------------------------------------

print("\n" + "=" * 70)
print("1. BASIC")
print("=" * 70)

print(f"Features : {len(gdf)}")
print(f"Columns  : {len(gdf.columns)}")
print(f"CRS      : {gdf.crs}")


# ------------------------------------------------------------
# GEOMETRY
# ------------------------------------------------------------

print("\n" + "=" * 70)
print("2. GEOMETRY")
print("=" * 70)

print(
    gdf.geometry.geom_type.value_counts().to_string()
)

print(
    f"\nNull geometries    : {gdf.geometry.isna().sum()}"
)

print(
    f"Empty geometries   : {gdf.geometry.is_empty.sum()}"
)

print(
    f"Invalid geometries : {(~gdf.geometry.is_valid).sum()}"
)


# ------------------------------------------------------------
# IMPORTANT FIELDS
# ------------------------------------------------------------

important_fields = [
    "DRAIN_ID",
    "DRAIN_LEN",
    "DRAIN_WID",
    "DRAIN_DEP",
    "DRAIN_SIZE",
    "DRAIN_TYPE",
    "INVERT_SP",
    "INVERT_EP",
    "WATER_FLOW",
    "STATUS",
    "WARD",
    "ZONE",
]


print("\n" + "=" * 70)
print("3. IMPORTANT FIELD COMPLETENESS")
print("=" * 70)

for field in important_fields:

    if field not in gdf.columns:

        print(f"{field:20} NOT FOUND")
        continue

    missing = gdf[field].isna().sum()

    populated = len(gdf) - missing

    percentage = (
        populated / len(gdf) * 100
    )

    print(
        f"{field:20} "
        f"{populated:6}/{len(gdf)} "
        f"({percentage:6.2f}% populated)"
    )


# ------------------------------------------------------------
# DUPLICATE IDs
# ------------------------------------------------------------

print("\n" + "=" * 70)
print("4. DUPLICATE DRAIN IDs")
print("=" * 70)

if "DRAIN_ID" in gdf.columns:

    duplicate_mask = gdf["DRAIN_ID"].duplicated(
        keep=False
    )

    duplicate_count = duplicate_mask.sum()

    print(
        f"Records with duplicate DRAIN_ID: "
        f"{duplicate_count}"
    )

    if duplicate_count > 0:

        print("\nExamples:")

        print(
            gdf.loc[
                duplicate_mask,
                ["DRAIN_ID"]
            ]
            .head(20)
            .to_string(index=False)
        )


# ------------------------------------------------------------
# SAMPLE
# ------------------------------------------------------------

print("\n" + "=" * 70)
print("5. SAMPLE DATA")
print("=" * 70)

print(
    gdf[
        [
            "DRAIN_ID",
            "DRAIN_LEN",
            "DRAIN_WID",
            "DRAIN_DEP",
            "DRAIN_SIZE",
            "DRAIN_TYPE",
            "INVERT_SP",
            "INVERT_EP",
            "WATER_FLOW",
        ]
    ]
    .head(10)
    .to_string(index=False)
)


# ------------------------------------------------------------
# END
# ------------------------------------------------------------

print("\n" + "=" * 70)
print("VALIDATION COMPLETE")
print("=" * 70)