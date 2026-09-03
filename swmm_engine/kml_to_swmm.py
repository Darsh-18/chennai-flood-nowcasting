"""
kml_to_swmm.py
--------------
Parses a Stormwater Drainage KML file and converts it into a valid
SWMM 5 input file (.inp).

Public API
----------
    haversine_distance(coord1, coord2) -> float
    process_kml_to_inp(kml_path, output_inp_path, config_path)

CLI usage
---------
    python -m swmm_engine.kml_to_swmm
    python -m swmm_engine.kml_to_swmm data/stormwater_drainage.kml outputs/network.inp
"""

import json
import math
import os
import sys
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Type aliases
# ---------------------------------------------------------------------------

Coord = Tuple[float, float]          # (longitude, latitude)
Segment = Tuple[Coord, Coord]        # (start_coord, end_coord)

# ---------------------------------------------------------------------------
# KML namespace variants used by different GIS exporters
# ---------------------------------------------------------------------------

_KML_NAMESPACES: List[str] = [
    "http://www.opengis.net/kml/2.2",
    "http://earth.google.com/kml/2.2",
    "http://earth.google.com/kml/2.1",
    "http://www.opengis.net/kml/2.3",
    "",   # no namespace (bare KML)
]

# Minimum pipe length enforced to avoid zero-length execution errors in SWMM
_MIN_LENGTH_M: float = 10.0


# ---------------------------------------------------------------------------
# Haversine helper
# ---------------------------------------------------------------------------

def haversine_distance(coord1: Coord, coord2: Coord) -> float:
    """
    Calculate the great-circle distance in metres between two points on Earth.

    Parameters
    ----------
    coord1 : (longitude, latitude) in decimal degrees
    coord2 : (longitude, latitude) in decimal degrees

    Returns
    -------
    float
        Distance in metres.
    """
    lon1, lat1 = coord1
    lon2, lat2 = coord2

    R = 6_371_000.0  # Earth's mean radius in metres

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return R * c


# ---------------------------------------------------------------------------
# Internal KML helpers
# ---------------------------------------------------------------------------

def _detect_namespace(root: ET.Element) -> str:
    """
    Detect the KML namespace from the root element tag.

    Returns the namespace URI string (e.g. ``'{http://www.opengis.net/kml/2.2}'``),
    or an empty string if the document uses no namespace.
    """
    tag = root.tag  # e.g. "{http://www.opengis.net/kml/2.2}kml"
    if tag.startswith("{"):
        return tag[: tag.index("}") + 1]   # includes braces for ET queries
    return ""


def _iter_tag(element: ET.Element, ns: str, local: str):
    """Yield all descendants matching ``ns + local``."""
    return element.iter(f"{ns}{local}")


def _parse_coordinate_string(raw: str) -> List[Coord]:
    """
    Parse a KML ``<coordinates>`` text block into a list of (lon, lat) pairs.

    KML coordinate tuples are ``lon,lat[,alt]`` separated by whitespace.
    """
    coords: List[Coord] = []
    for token in raw.strip().split():
        parts = token.split(",")
        if len(parts) < 2:
            continue
        try:
            lon = float(parts[0])
            lat = float(parts[1])
            coords.append((lon, lat))
        except ValueError:
            continue
    return coords


def _extract_segments(kml_path: str) -> List[Segment]:
    """
    Parse the KML file and return every LineString as a (start, end) pair.

    Only the first and last coordinate of each LineString are used as junction
    endpoints (consistent with pipe-network modelling conventions).

    Raises
    ------
    FileNotFoundError
        If ``kml_path`` does not exist.
    ValueError
        If the file is not valid XML, or contains no readable LineStrings.
    """
    if not os.path.exists(kml_path):
        raise FileNotFoundError(f"KML file not found: '{kml_path}'")

    try:
        tree = ET.parse(kml_path)
    except ET.ParseError as exc:
        raise ValueError(f"Malformed KML / XML in '{kml_path}': {exc}") from exc

    root = tree.getroot()
    ns = _detect_namespace(root)

    segments: List[Segment] = []

    for placemark in _iter_tag(root, ns, "Placemark"):
        for linestring in _iter_tag(placemark, ns, "LineString"):
            coords_el = linestring.find(f"{ns}coordinates")
            if coords_el is None or not coords_el.text:
                continue

            coords = _parse_coordinate_string(coords_el.text)
            if len(coords) < 2:
                continue  # degenerate geometry – skip silently

            # Use only the first and last vertex as junction nodes
            segments.append((coords[0], coords[-1]))

    if not segments:
        raise ValueError(
            f"No readable LineString geometries found in '{kml_path}'. "
            "Ensure the file contains Placemark/LineString elements."
        )

    return segments


# ---------------------------------------------------------------------------
# SWMM .inp writer helpers
# ---------------------------------------------------------------------------

def _section(header: str, body: str) -> str:
    """Return a formatted SWMM section block."""
    return f"[{header}]\n{body}\n\n"


def _inp_title() -> str:
    return _section(
        "TITLE",
        "Chennai Flood Nowcasting – Auto-generated from KML\n"
        "Generated by swmm_engine/kml_to_swmm.py",
    )


def _inp_options() -> str:
    body = (
        ";;Option              Value\n"
        "FLOW_UNITS           CMS\n"
        "INFILTRATION         GREEN_AMPT\n"
        "FLOW_ROUTING         DYNWAVE\n"
        "LINK_OFFSETS         DEPTH\n"
        "MIN_SLOPE            0\n"
        "ALLOW_PONDING        NO\n"
        "SKIP_STEADY_STATE    NO\n"
        "\n"
        "START_DATE           01/01/2023\n"
        "START_TIME           00:00:00\n"
        "REPORT_START_DATE    01/01/2023\n"
        "REPORT_START_TIME    00:00:00\n"
        "END_DATE             01/01/2023\n"
        "END_TIME             06:00:00\n"
        "SWEEP_START          01/01\n"
        "SWEEP_END            12/31\n"
        "DRY_DAYS             0\n"
        "REPORT_STEP          00:05:00\n"
        "WET_STEP             00:05:00\n"
        "DRY_STEP             01:00:00\n"
        "ROUTING_STEP         0:00:30\n"
        "\n"
        "INERTIAL_DAMPING     PARTIAL\n"
        "NORMAL_FLOW_LIMITED  BOTH\n"
        "FORCE_MAIN_EQUATION  H-W\n"
        "VARIABLE_STEP        0.75\n"
        "LENGTHENING_STEP     0\n"
        "MIN_SURFAREA         0\n"
        "MAX_TRIALS           8\n"
        "HEAD_TOLERANCE       0.0015\n"
        "SYS_FLOW_TOL         5\n"
        "LAT_FLOW_TOL         5\n"
        "MINIMUM_STEP         0.5\n"
        "THREADS              1"
    )
    return _section("OPTIONS", body)


def _inp_junctions(
    junctions: Dict[Coord, str],
    outfall_id: str,
    base_elev: float = 10.0,
) -> str:
    """
    [JUNCTIONS] section – one row per junction (excluding the outfall node).

    Invert elevations decrease slightly from node to node to create a mild
    hydraulic gradient; all nodes default to 5 m maximum depth.
    """
    header = (
        ";;Name           Elevation  MaxDepth   InitDepth  SurDepth   Aponded\n"
        ";;-------------- ---------- ---------- ---------- ---------- ----------"
    )
    rows: List[str] = [header]
    sorted_nodes = sorted(junctions.items(), key=lambda kv: kv[1])  # J1, J2 …

    for idx, (coord, jid) in enumerate(sorted_nodes):
        if jid == outfall_id:
            continue  # outfall goes in [OUTFALLS]
        elev = round(base_elev - idx * 0.1, 3)  # gentle 0.1 m drop per node
        rows.append(f"{jid:<16} {elev:<10} 5          0          0          0")

    return _section("JUNCTIONS", "\n".join(rows))


def _inp_outfalls(outfall_id: str, outfall_elev: float = 9.0) -> str:
    header = (
        ";;Name           Elevation  Type       Stage Data       Gated    Route To\n"
        ";;-------------- ---------- ---------- ---------------- -------- ----------------"
    )
    body = f"{outfall_id:<16} {outfall_elev:<10} FREE                        NO"
    return _section("OUTFALLS", f"{header}\n{body}")


def _inp_conduits(
    conduits: List[Tuple[str, str, str, float]],   # (cid, from_id, to_id, length)
    manning_n: float,
) -> str:
    """[CONDUITS] section."""
    header = (
        ";;Name           From Node        To Node          Length     Roughness  "
        "InOffset   OutOffset  InitFlow   MaxFlow\n"
        ";;-------------- ---------------- ---------------- ---------- ---------- "
        "---------- ---------- ---------- ----------"
    )
    rows: List[str] = [header]
    for cid, from_id, to_id, length in conduits:
        rows.append(
            f"{cid:<16} {from_id:<16} {to_id:<16} "
            f"{length:<10.3f} {manning_n:<10.4f} 0          0          0          0"
        )
    return _section("CONDUITS", "\n".join(rows))


def _inp_xsections(
    conduit_ids: List[str],
    diameter: float,
) -> str:
    """[XSECTIONS] section – circular cross-section for all conduits."""
    header = (
        ";;Link           Shape        Geom1      Geom2      Geom3      Geom4      Barrels    Culvert\n"
        ";;-------------- ------------ ---------- ---------- ---------- ---------- ---------- ----------"
    )
    rows: List[str] = [header]
    for cid in conduit_ids:
        rows.append(
            f"{cid:<16} CIRCULAR     {diameter:<10} 0          0          0          1"
        )
    return _section("XSECTIONS", "\n".join(rows))


def _inp_coordinates(junctions: Dict[Coord, str]) -> str:
    """[COORDINATES] section – geographic positions of all nodes."""
    header = (
        ";;Node           X-Coord            Y-Coord\n"
        ";;-------------- ------------------ ------------------"
    )
    rows: List[str] = [header]
    for (lon, lat), jid in sorted(junctions.items(), key=lambda kv: kv[1]):
        rows.append(f"{jid:<16} {lon:<18.6f} {lat:<18.6f}")
    return _section("COORDINATES", "\n".join(rows))


# ---------------------------------------------------------------------------
# Main conversion function
# ---------------------------------------------------------------------------

def process_kml_to_inp(
    kml_path: str,
    output_inp_path: str,
    config_path: str = "swmm_engine/config/default_params.json",
) -> None:
    """
    Convert a Stormwater Drainage KML file into a SWMM 5 .inp file.

    Parameters
    ----------
    kml_path : str
        Path to the input KML file.
    output_inp_path : str
        Destination path for the generated SWMM .inp file.
    config_path : str, optional
        Path to ``default_params.json``.  Falls back to built-in defaults if
        the file is absent or unreadable.

    Raises
    ------
    FileNotFoundError
        If ``kml_path`` does not exist.
    ValueError
        If the KML is malformed or contains no usable LineString geometries.
    """

    # ------------------------------------------------------------------
    # 1. Load engine configuration (graceful fallback to built-in defaults)
    # ------------------------------------------------------------------
    pipe_diameter_m: float = 1.2
    manning_n: float = 0.013

    if os.path.exists(config_path):
        try:
            with open(config_path, encoding="utf-8") as fh:
                cfg = json.load(fh)
            assumptions = cfg.get("assumptions", {})
            pipe_diameter_m = float(
                assumptions.get("pipe_diameter_m", {}).get("value", pipe_diameter_m)
            )
            manning_n = float(
                assumptions.get("manning_n_concrete", {}).get("value", manning_n)
            )
            print(f"[INFO] Config loaded from '{config_path}'.")
        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            print(f"[WARN] Could not read config '{config_path}': {exc}. Using defaults.")
    else:
        print(f"[WARN] Config not found at '{config_path}'. Using built-in defaults.")

    print(f"[INFO] pipe_diameter_m={pipe_diameter_m}, manning_n={manning_n}")

    # ------------------------------------------------------------------
    # 2. Parse KML and extract (start, end) coordinate segments
    # ------------------------------------------------------------------
    print(f"[INFO] Parsing KML: '{kml_path}' ...")
    segments: List[Segment] = _extract_segments(kml_path)   # raises on error
    print(f"[INFO] Found {len(segments)} LineString segment(s).")

    # ------------------------------------------------------------------
    # 3. Build junction registry (unique coords → J1, J2, …)
    # ------------------------------------------------------------------
    junctions: Dict[Coord, str] = {}
    junction_counter = 1

    def _get_or_create_junction(coord: Coord) -> str:
        nonlocal junction_counter
        if coord not in junctions:
            junctions[coord] = f"J{junction_counter}"
            junction_counter += 1
        return junctions[coord]

    # ------------------------------------------------------------------
    # 4. Build conduit list
    # ------------------------------------------------------------------
    conduits: List[Tuple[str, str, str, float]] = []

    for idx, (start_coord, end_coord) in enumerate(segments, start=1):
        from_id = _get_or_create_junction(start_coord)
        to_id = _get_or_create_junction(end_coord)

        raw_length = haversine_distance(start_coord, end_coord)
        length = max(raw_length, _MIN_LENGTH_M)  # enforce SWMM minimum

        if raw_length < 1.0:
            print(
                f"[WARN] Segment C{idx} has near-zero computed length "
                f"({raw_length:.4f} m). Enforcing minimum length of {_MIN_LENGTH_M} m."
            )

        conduits.append((f"C{idx}", from_id, to_id, length))

    print(f"[INFO] Built {len(junctions)} junction(s) and {len(conduits)} conduit(s).")

    # ------------------------------------------------------------------
    # 5. Designate the last unique node as the FREE outfall
    # ------------------------------------------------------------------
    # The last registered junction is treated as the network outlet.
    last_coord = list(junctions.keys())[-1]
    outfall_id: str = junctions[last_coord]

    # Promote the outfall node's ID to the conventional "OUT1" label for
    # clarity, and update all references in the conduit list.
    old_outfall_label = outfall_id
    outfall_id = "OUT1"
    junctions[last_coord] = outfall_id

    conduits = [
        (
            cid,
            outfall_id if from_id == old_outfall_label else from_id,
            outfall_id if to_id == old_outfall_label else to_id,
            length,
        )
        for cid, from_id, to_id, length in conduits
    ]

    conduit_ids = [cid for cid, *_ in conduits]

    # ------------------------------------------------------------------
    # 6. Assemble the SWMM .inp content
    # ------------------------------------------------------------------
    inp_content = (
        _inp_title()
        + _inp_options()
        + _inp_junctions(junctions, outfall_id)
        + _inp_outfalls(outfall_id)
        + _inp_conduits(conduits, manning_n)
        + _inp_xsections(conduit_ids, pipe_diameter_m)
        + _inp_coordinates(junctions)
        + "[END]\n"
    )

    # ------------------------------------------------------------------
    # 7. Write output
    # ------------------------------------------------------------------
    output_dir = os.path.dirname(output_inp_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    with open(output_inp_path, "w", encoding="utf-8") as fh:
        fh.write(inp_content)

    print(f"[INFO] SWMM .inp written to '{output_inp_path}'.")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Accept optional positional arguments: kml_path  output_inp_path
    _kml_path = sys.argv[1] if len(sys.argv) > 1 else "data/stormwater_drainage.kml"
    _out_path = sys.argv[2] if len(sys.argv) > 2 else "swmm_engine/outputs/pilot_network.inp"

    print("=" * 60)
    print("  KML → SWMM .inp Converter")
    print("=" * 60)

    try:
        process_kml_to_inp(
            kml_path=_kml_path,
            output_inp_path=_out_path,
        )
        print("\n[SUCCESS] Conversion complete.")
    except FileNotFoundError as e:
        print(f"\n[ERROR] {e}")
        sys.exit(1)
    except ValueError as e:
        print(f"\n[ERROR] {e}")
        sys.exit(1)
