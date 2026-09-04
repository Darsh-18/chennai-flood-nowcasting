from pathlib import Path
import xml.etree.ElementTree as ET
import re

import geopandas as gpd
from shapely.geometry import LineString, MultiLineString
from shapely.ops import transform
from pyproj import Transformer


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

INPUT_FILE = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "drainage"
    / "chennai_swd.kml"
)

OUTPUT_DIR = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "drainage"
)

OUTPUT_FILE = OUTPUT_DIR / "chennai_swd.gpkg"


# ============================================================
# XML HELPERS
# ============================================================

def strip_namespace(tag):
    """Remove XML namespace from an XML tag."""

    if "}" in tag:
        return tag.split("}", 1)[1]

    return tag


def get_child_text(element, tag_name):
    """Get text from the first matching XML element."""

    for child in element.iter():

        if strip_namespace(child.tag) == tag_name:

            if child.text:
                return child.text.strip()

    return None


def get_all_elements(element, tag_name):
    """Return all matching XML elements."""

    results = []

    for child in element.iter():

        if strip_namespace(child.tag) == tag_name:
            results.append(child)

    return results


# ============================================================
# COORDINATE PARSER
# ============================================================

def parse_coordinates(coordinate_text):
    """
    Convert KML coordinate text into:
    
    [(longitude, latitude), ...]
    """

    if not coordinate_text:
        return []

    coordinates = []

    # KML coordinates are normally:
    #
    # longitude,latitude,altitude
    #
    # separated by spaces/newlines.

    tokens = re.split(r"\s+", coordinate_text.strip())

    for token in tokens:

        if not token:
            continue

        parts = token.split(",")

        if len(parts) < 2:
            continue

        try:

            longitude = float(parts[0])
            latitude = float(parts[1])

            coordinates.append(
                (longitude, latitude)
            )

        except ValueError:

            continue

    return coordinates


# ============================================================
# GEOMETRY EXTRACTION
# ============================================================

def extract_geometry(placemark):
    """
    Extract LineString / MultiGeometry geometry
    from a KML Placemark.
    """

    line_strings = []

    # --------------------------------------------------------
    # Find all LineString elements
    # --------------------------------------------------------

    for line_string in get_all_elements(
        placemark,
        "LineString"
    ):

        coordinate_element = None

        for child in line_string.iter():

            if strip_namespace(child.tag) == "coordinates":

                coordinate_element = child
                break

        if coordinate_element is None:
            continue

        coordinates = parse_coordinates(
            coordinate_element.text
        )

        # A valid LineString requires at least 2 points.

        if len(coordinates) >= 2:

            line_strings.append(
                LineString(coordinates)
            )

    # --------------------------------------------------------
    # No geometry
    # --------------------------------------------------------

    if not line_strings:

        return None

    # --------------------------------------------------------
    # Single LineString
    # --------------------------------------------------------

    if len(line_strings) == 1:

        return line_strings[0]

    # --------------------------------------------------------
    # Multiple LineStrings
    # --------------------------------------------------------

    return MultiLineString(line_strings)


# ============================================================
# ATTRIBUTE EXTRACTION
# ============================================================

def extract_attributes(placemark):
    """
    Extract KML ExtendedData attributes.
    """

    attributes = {}

    # --------------------------------------------------------
    # SimpleData
    # --------------------------------------------------------

    for element in placemark.iter():

        if strip_namespace(element.tag) == "SimpleData":

            field_name = element.attrib.get("name")

            if field_name:

                value = (
                    element.text.strip()
                    if element.text
                    else None
                )

                attributes[field_name] = value

    # --------------------------------------------------------
    # Data
    # --------------------------------------------------------

    for data_element in placemark.iter():

        if strip_namespace(data_element.tag) != "Data":
            continue

        field_name = data_element.attrib.get("name")

        if not field_name:
            continue

        value = None

        for child in data_element:

            if strip_namespace(child.tag) == "value":

                if child.text:
                    value = child.text.strip()

                break

        attributes[field_name] = value

    return attributes


# ============================================================
# START
# ============================================================

print("=" * 70)
print("CHENNAI STORMWATER DRAINAGE")
print("KML → GEOPACKAGE CONVERTER")
print("=" * 70)

print(f"\nInput:")
print(INPUT_FILE)

print(f"\nOutput:")
print(OUTPUT_FILE)


# ============================================================
# CHECK INPUT
# ============================================================

if not INPUT_FILE.exists():

    print("\nERROR: KML file not found.")

    raise SystemExit(1)


# ============================================================
# OUTPUT DIRECTORY
# ============================================================

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# PARSE XML
# ============================================================

print("\nParsing KML XML...")

try:

    tree = ET.parse(INPUT_FILE)
    root = tree.getroot()

except ET.ParseError as error:

    print("\nERROR: Invalid XML.")
    print(error)

    raise SystemExit(1)


print("XML parsing successful.")


# ============================================================
# FIND PLACEMARKS
# ============================================================

placemarks = []

for element in root.iter():

    if strip_namespace(element.tag) == "Placemark":

        placemarks.append(element)


print(
    f"Found {len(placemarks)} Placemark features."
)


# ============================================================
# PROCESS FEATURES
# ============================================================

records = []

missing_geometry = []

invalid_geometry = []

multigeometry_count = 0


for index, placemark in enumerate(placemarks):

    attributes = extract_attributes(
        placemark
    )

    geometry = extract_geometry(
        placemark
    )

    # --------------------------------------------------------
    # Missing geometry
    # --------------------------------------------------------

    if geometry is None:

        missing_geometry.append(index)

        continue

    # --------------------------------------------------------
    # Count MultiLineStrings
    # --------------------------------------------------------

    if geometry.geom_type == "MultiLineString":

        multigeometry_count += 1

    # --------------------------------------------------------
    # Validate geometry
    # --------------------------------------------------------

    if geometry.is_empty:

        invalid_geometry.append(index)

        continue

    if not geometry.is_valid:

        invalid_geometry.append(index)

        continue

    # --------------------------------------------------------
    # Add geometry
    # --------------------------------------------------------

    attributes["geometry"] = geometry

    records.append(attributes)


# ============================================================
# CREATE GEODATAFRAME
# ============================================================

print("\nCreating GeoDataFrame...")

gdf = gpd.GeoDataFrame(
    records,
    geometry="geometry",
    crs="EPSG:4326"
)


# ============================================================
# SAVE
# ============================================================

print("\nSaving GeoPackage...")

if OUTPUT_FILE.exists():

    OUTPUT_FILE.unlink()

gdf.to_file(
    OUTPUT_FILE,
    layer="drains",
    driver="GPKG"
)


# ============================================================
# VERIFY
# ============================================================

print("\nVerifying output...")

check = gpd.read_file(
    OUTPUT_FILE,
    layer="drains"
)


# ============================================================
# REPORT
# ============================================================

print("\n" + "=" * 70)
print("CONVERSION COMPLETE")
print("=" * 70)

print(f"""
Original Placemark count : {len(placemarks)}

Converted features       : {len(gdf)}

Missing geometry         : {len(missing_geometry)}

Invalid geometry         : {len(invalid_geometry)}

MultiGeometry converted  : {multigeometry_count}

Output CRS               : {gdf.crs}

Output file              : {OUTPUT_FILE}
""")


print("Output geometry types:")

print(
    gdf.geometry.geom_type.value_counts().to_string()
)


print("\nOutput columns:")

for column in gdf.columns:

    print(f"  - {column}")


# ============================================================
# MISSING FEATURES
# ============================================================

if missing_geometry:

    print("\nWARNING:")
    print(
        "The following Placemark indices had no usable geometry:"
    )

    print(missing_geometry[:20])

    print(
        "\nThese records were NOT deleted from the original KML."
    )


# ============================================================
# FINAL
# ============================================================

print("\n" + "=" * 70)
print("SUCCESS")
print("=" * 70)