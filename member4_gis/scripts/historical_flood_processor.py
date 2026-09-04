"""
historical_flood_processor.py
------------------------------
Process historical flood event data from Datasets/Historical Flood Events/

This script:
  1. Inspects all files in Datasets/Historical Flood Events/
  2. Converts supported formats to GeoPackage
  3. Documents any files that cannot be processed
  4. Writes processing metadata

Usage:
    PYTHONPATH=. <venv>/bin/python3 member4_gis/scripts/historical_flood_processor.py
"""

import json
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

# Possible directory names (the brief mentions a typo "Histoical")
HISTORICAL_DIRS = [
    PROJECT_ROOT / "Datasets" / "Historical Flood Events",
    PROJECT_ROOT / "Datasets" / "Histoical Flood Events",
    PROJECT_ROOT / "Datasets" / "historical_flood_events",
]

OUTPUT_DIR = PROJECT_ROOT / "member4_gis" / "data" / "historical_flood"

try:
    import geopandas as gpd
    import pandas as pd
    HAS_GEOPANDAS = True
except ImportError:
    HAS_GEOPANDAS = False

try:
    import json as _json
    HAS_JSON = True
except ImportError:
    HAS_JSON = False


def find_historical_dir() -> Path:
    for d in HISTORICAL_DIRS:
        if d.exists():
            return d
    return None


def scan_directory(base_dir: Path):
    """Recursively list all files with size and extension."""
    files = []
    for root, dirs, filenames in os.walk(base_dir):
        for fname in filenames:
            fpath = Path(root) / fname
            try:
                size_bytes = fpath.stat().st_size
            except OSError:
                size_bytes = -1
            files.append({
                "path": str(fpath),
                "relative": str(fpath.relative_to(base_dir)),
                "extension": fpath.suffix.lower(),
                "size_bytes": size_bytes,
                "size_kb": round(size_bytes / 1024, 1),
            })
    return files


def try_load_as_geodataframe(fpath: Path):
    """Attempt to load a file as a GeoDataFrame; return (gdf, error_msg)."""
    if not HAS_GEOPANDAS:
        return None, "geopandas not available"

    ext = fpath.suffix.lower()
    try:
        if ext in (".gpkg", ".geojson", ".json", ".shp", ".kml", ".kmz"):
            gdf = gpd.read_file(fpath)
            return gdf, None
        elif ext == ".csv":
            import pandas as pd
            df = pd.read_csv(fpath)
            # Try to detect lat/lon columns
            lat_cols = [c for c in df.columns if c.lower() in ("lat", "latitude", "y")]
            lon_cols = [c for c in df.columns if c.lower() in ("lon", "longitude", "long", "x")]
            if lat_cols and lon_cols:
                from shapely.geometry import Point
                geometry = [Point(row[lon_cols[0]], row[lat_cols[0]]) for _, row in df.iterrows()]
                gdf = gpd.GeoDataFrame(df, geometry=geometry, crs="EPSG:4326")
                return gdf, None
            return None, f"CSV has no recognizable lat/lon columns (found: {list(df.columns)[:10]})"
        else:
            return None, f"Unsupported extension: {ext}"
    except Exception as e:
        return None, str(e)


def main() -> None:
    print("=" * 70)
    print("  Historical Flood Data Processor")
    print("  Member 4 | Chennai Flood Nowcasting")
    print("=" * 70)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Find historical data directory
    hist_dir = find_historical_dir()

    if hist_dir is None:
        msg = (
            "\n[MISSING] Historical flood events directory not found.\n\n"
            "Searched for:\n"
        )
        for d in HISTORICAL_DIRS:
            msg += f"  {d}\n"
        msg += (
            "\nBLOCKER: Historical flood data processing cannot proceed.\n"
            "ACTION: Place historical flood data in one of the above directories.\n"
        )
        print(msg)

        metadata = {
            "status": "MISSING",
            "searched_paths": [str(d) for d in HISTORICAL_DIRS],
            "error": "No historical flood events directory found",
            "action_required": "Add historical flood data to Datasets/Historical Flood Events/",
            "note": (
                "Historical flood data should contain observed flood locations "
                "from past events (e.g., 2015 Chennai floods). "
                "Acceptable formats: GeoPackage, GeoJSON, Shapefile, KML, CSV with lat/lon."
            ),
        }
        with open(OUTPUT_DIR / "historical_flood_metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)
        print(f"[INFO] Status metadata written to {OUTPUT_DIR}/historical_flood_metadata.json")
        return

    print(f"\n[1] Found historical data directory: {hist_dir}")
    files = scan_directory(hist_dir)
    print(f"    Total files found: {len(files)}")

    if not files:
        print("    [WARN] Directory is empty.")
        metadata = {
            "status": "EMPTY",
            "directory": str(hist_dir),
            "files_found": 0,
            "error": "Historical flood events directory exists but is empty",
        }
        with open(OUTPUT_DIR / "historical_flood_metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)
        return

    # Show file listing
    print("\n    Files:")
    for fi in files:
        print(f"      {fi['relative']:50} {fi['size_kb']:>8} KB")

    # Attempt to load each file
    print("\n[2] Attempting to load files as geodata...")
    processed = []
    failed = []

    for fi in files:
        fpath = Path(fi["path"])
        ext = fi["extension"]

        # Skip metadata/system files
        if ext in (".ds_store", ".txt", ".pdf", ".md", ".json") and ext != ".geojson":
            if ext == ".json":
                pass  # try anyway
            else:
                print(f"    SKIP: {fi['relative']} (non-spatial format)")
                continue

        print(f"    Loading: {fi['relative']}...")
        gdf, err = try_load_as_geodataframe(fpath)

        if gdf is not None:
            print(f"      OK: {len(gdf)} features, CRS={gdf.crs}, columns={list(gdf.columns)[:8]}")

            # Ensure CRS
            if gdf.crs is None:
                print("      [WARN] No CRS detected; assuming EPSG:4326")
                gdf = gdf.set_crs("EPSG:4326")

            # Detect depth column
            depth_cols = [c for c in gdf.columns if "depth" in c.lower()]
            depth_m_added = False
            if depth_cols:
                depth_col = depth_cols[0]
                print(f"      Depth column detected: {depth_col}")
                # If column name suggests feet, convert
                if "ft" in depth_col.lower() or "feet" in depth_col.lower():
                    gdf["depth_m"] = gdf[depth_col] * 0.3048
                    depth_m_added = True
                    print(f"      Converted {depth_col} (ft) → depth_m (m)")
                elif "cm" in depth_col.lower():
                    gdf["depth_m"] = gdf[depth_col] / 100.0
                    depth_m_added = True
                    print(f"      Converted {depth_col} (cm) → depth_m (m)")
                elif depth_col != "depth_m":
                    # Assume metres
                    gdf["depth_m"] = gdf[depth_col]
                    depth_m_added = True
                    print(f"      Copied {depth_col} → depth_m (assumed metres)")

            # Add provenance field
            gdf["data_source"] = "historical_observed"
            gdf["source_file"] = fi["relative"]

            # Save to GeoPackage
            safe_name = fpath.stem.replace(" ", "_").lower()
            out_gpkg = OUTPUT_DIR / f"{safe_name}.gpkg"
            gdf.to_file(out_gpkg, driver="GPKG", layer="historical_floods")
            print(f"      Saved: {out_gpkg}")

            processed.append({
                "source_file": fi["relative"],
                "output_gpkg": str(out_gpkg),
                "features": len(gdf),
                "crs": str(gdf.crs),
                "columns": list(gdf.columns),
                "depth_m_added": depth_m_added,
            })
        else:
            print(f"      FAILED: {err}")
            failed.append({
                "source_file": fi["relative"],
                "error": err,
            })

    # Write summary metadata
    summary = {
        "status": "PROCESSED" if processed else "NO_DATA_LOADABLE",
        "directory": str(hist_dir),
        "files_found": len(files),
        "files_processed": len(processed),
        "files_failed": len(failed),
        "processed": processed,
        "failed": failed,
        "note": (
            "Historical flood data is treated as observed/reference data. "
            "It is NOT SWMM prediction output. "
            "It is used for spatial validation of simulated flood locations."
        ),
    }

    meta_path = OUTPUT_DIR / "historical_flood_metadata.json"
    with open(meta_path, "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\n[DONE] Historical flood processing complete.")
    print(f"  Processed: {len(processed)} file(s)")
    print(f"  Failed:    {len(failed)} file(s)")
    print(f"  Metadata:  {meta_path}")


if __name__ == "__main__":
    main()
