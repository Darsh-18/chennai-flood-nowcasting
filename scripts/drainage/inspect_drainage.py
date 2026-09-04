from pathlib import Path
import xml.etree.ElementTree as ET
from collections import Counter


# ============================================================
# PATH
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

INPUT_FILE = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "drainage"
    / "chennai_swd.kml"
)


# ============================================================
# HELPERS
# ============================================================

def strip_namespace(tag):
    """Remove XML namespace from a tag."""
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def find_text(element, tag_name):
    """Find first matching child text regardless of namespace."""

    for child in element.iter():

        if strip_namespace(child.tag) == tag_name:

            if child.text:
                return child.text.strip()

    return None


def find_all_text(element, tag_name):
    """Find all matching child text values."""

    values = []

    for child in element.iter():

        if strip_namespace(child.tag) == tag_name:

            if child.text:
                values.append(child.text.strip())

    return values


# ============================================================
# START
# ============================================================

print("=" * 70)
print("CHENNAI STORMWATER DRAINAGE - RAW KML INSPECTION")
print("=" * 70)

print("\nInput file:")
print(INPUT_FILE)

if not INPUT_FILE.exists():

    print("\nERROR: KML file not found!")
    print(INPUT_FILE)

    raise SystemExit(1)


# ============================================================
# FILE SIZE
# ============================================================

file_size_mb = INPUT_FILE.stat().st_size / (1024 * 1024)

print(f"\nFile size: {file_size_mb:.2f} MB")


# ============================================================
# PARSE XML
# ============================================================

print("\nParsing XML...")

try:

    tree = ET.parse(INPUT_FILE)
    root = tree.getroot()

except ET.ParseError as e:

    print("\nERROR: The KML XML itself is malformed.")
    print(e)

    raise SystemExit(1)


print("XML parsing: SUCCESS")


# ============================================================
# FIND PLACEMARKS
# ============================================================

placemarks = []

for element in root.iter():

    if strip_namespace(element.tag) == "Placemark":

        placemarks.append(element)


print("\n" + "=" * 70)
print("1. FEATURE COUNT")
print("=" * 70)

print(f"Placemark count: {len(placemarks)}")


# ============================================================
# GEOMETRY TYPES
# ============================================================

geometry_counter = Counter()

for placemark in placemarks:

    found_geometry = False

    for element in placemark.iter():

        tag = strip_namespace(element.tag)

        if tag in [
            "LineString",
            "Point",
            "Polygon",
            "MultiGeometry",
            "LinearRing",
        ]:

            geometry_counter[tag] += 1
            found_geometry = True

    if not found_geometry:
        geometry_counter["NO_GEOMETRY"] += 1


print("\n" + "=" * 70)
print("2. GEOMETRY TYPES")
print("=" * 70)

for geometry_type, count in geometry_counter.items():

    print(f"{geometry_type:20} {count}")


# ============================================================
# COORDINATE CHECK
# ============================================================

print("\n" + "=" * 70)
print("3. COORDINATE CHECK")
print("=" * 70)

coordinate_count = 0
empty_coordinate_count = 0
multiple_coordinate_count = 0

bad_coordinate_examples = []

for index, placemark in enumerate(placemarks):

    coordinates = find_all_text(placemark, "coordinates")

    if not coordinates:

        empty_coordinate_count += 1

        if len(bad_coordinate_examples) < 10:

            name = find_text(placemark, "name")

            bad_coordinate_examples.append(
                (index, name, "NO COORDINATES")
            )

        continue

    coordinate_count += 1

    if len(coordinates) > 1:

        multiple_coordinate_count += 1


print(f"Placemarks with coordinates : {coordinate_count}")
print(f"Without coordinates        : {empty_coordinate_count}")
print(f"Multiple coordinate blocks  : {multiple_coordinate_count}")


# ============================================================
# SHOW BAD COORDINATE EXAMPLES
# ============================================================

if bad_coordinate_examples:

    print("\nExamples without coordinates:")

    for index, name, reason in bad_coordinate_examples:

        print(
            f"  Feature {index} | "
            f"name={name} | "
            f"{reason}"
        )


# ============================================================
# CHECK COORDINATE FORMAT
# ============================================================

print("\n" + "=" * 70)
print("4. COORDINATE FORMAT CHECK")
print("=" * 70)

bad_coordinate_format = []

checked_coordinates = 0

for index, placemark in enumerate(placemarks):

    coordinate_blocks = find_all_text(
        placemark,
        "coordinates"
    )

    for coordinate_block in coordinate_blocks:

        # Split coordinate tuples
        tuples = coordinate_block.split()

        for coordinate_tuple in tuples:

            checked_coordinates += 1

            parts = coordinate_tuple.split(",")

            try:

                if len(parts) < 2:

                    raise ValueError(
                        "Less than longitude/latitude"
                    )

                longitude = float(parts[0])
                latitude = float(parts[1])

                # Basic geographic sanity check
                if not (-180 <= longitude <= 180):

                    raise ValueError(
                        f"Invalid longitude: {longitude}"
                    )

                if not (-90 <= latitude <= 90):

                    raise ValueError(
                        f"Invalid latitude: {latitude}"
                    )

            except Exception as e:

                if len(bad_coordinate_format) < 20:

                    name = find_text(
                        placemark,
                        "name"
                    )

                    bad_coordinate_format.append(
                        (
                            index,
                            name,
                            coordinate_tuple,
                            str(e),
                        )
                    )


print(
    f"Coordinate tuples checked: "
    f"{checked_coordinates}"
)

print(
    f"Invalid coordinate tuples: "
    f"{len(bad_coordinate_format)}"
)


if bad_coordinate_format:

    print("\nExamples of invalid coordinates:")

    for item in bad_coordinate_format:

        index, name, coordinate, error = item

        print(
            f"\nFeature: {index}"
            f"\nName: {name}"
            f"\nCoordinate: {coordinate}"
            f"\nError: {error}"
        )


# ============================================================
# FIELD / ATTRIBUTE INSPECTION
# ============================================================

print("\n" + "=" * 70)
print("5. ATTRIBUTE NAMES")
print("=" * 70)

field_names = Counter()

for placemark in placemarks:

    for element in placemark.iter():

        tag = strip_namespace(element.tag)

        if tag == "SimpleData":

            field_name = element.attrib.get("name")

            if field_name:

                field_names[field_name] += 1

        elif tag == "Data":

            field_name = element.attrib.get("name")

            if field_name:

                field_names[field_name] += 1


for field_name, count in field_names.most_common():

    print(
        f"{field_name:30} {count}"
    )


# ============================================================
# SAMPLE FEATURE
# ============================================================

print("\n" + "=" * 70)
print("6. FIRST FEATURE")
print("=" * 70)

if placemarks:

    first = placemarks[0]

    name = find_text(first, "name")

    print(f"Name: {name}")

    coordinates = find_all_text(
        first,
        "coordinates"
    )

    print("\nCoordinates:")

    for coordinate in coordinates:

        print(coordinate[:500])


# ============================================================
# SUMMARY
# ============================================================

print("\n" + "=" * 70)
print("INSPECTION COMPLETE")
print("=" * 70)

print(f"""
KML XML valid             : YES
Total Placemarks          : {len(placemarks)}
Features with coordinates : {coordinate_count}
Features without coords   : {empty_coordinate_count}
Coordinate tuples checked : {checked_coordinates}
Bad coordinate tuples     : {len(bad_coordinate_format)}
""")

print(
    "No files were modified."
)

print("=" * 70)