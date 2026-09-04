"""
dem_inspector.py
----------------
Inspect and document the Chennai DEM (chennai_dem_glo30.tif).

Produces:
  - member4_gis/data/dem/dem_metadata.json   (CRS, resolution, extent, stats)
  - member4_gis/data/dem/dem_metadata.txt    (human-readable summary)

Usage (from project root):
    PYTHONPATH=. <venv>/bin/python3 member4_gis/scripts/dem_inspector.py

NOTE: The Datasets/DEM/chennai_dem_glo30.tif file is required.
If absent, this script reports the missing file and exits with a clear message.
"""

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

DEM_PATH = PROJECT_ROOT / "Datasets" / "DEM" / "chennai_dem_glo30.tif"
OUTPUT_DIR = PROJECT_ROOT / "member4_gis" / "data" / "dem"

try:
    import rasterio
    from rasterio.crs import CRS
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


def main() -> None:
    print("=" * 70)
    print("  DEM Inspector | Chennai Flood Nowcasting")
    print("=" * 70)

    if not DEM_PATH.exists():
        msg = (
            f"\n[MISSING] DEM file not found: {DEM_PATH}\n\n"
            "The Chennai DEM (chennai_dem_glo30.tif) was referenced in the project\n"
            "brief as being located at Datasets/DEM/chennai_dem_glo30.tif, but this\n"
            "file does not exist in the local working tree.\n\n"
            "BLOCKER: DEM processing cannot proceed without this file.\n"
            "ACTION REQUIRED: Add the DEM file to Datasets/DEM/ and re-run.\n"
        )
        print(msg)
        metadata = {
            "status": "MISSING",
            "expected_path": str(DEM_PATH),
            "error": "DEM file not found at expected location",
            "action_required": "Place chennai_dem_glo30.tif at Datasets/DEM/",
        }
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_DIR / "dem_metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)
        print(f"[INFO] Missing-file metadata written to {OUTPUT_DIR}/dem_metadata.json")
        return

    if not HAS_RASTERIO:
        print("[ERROR] rasterio not installed. Cannot read DEM.")
        sys.exit(1)

    print(f"\n[1] Opening DEM: {DEM_PATH}")

    with rasterio.open(DEM_PATH) as src:
        crs = src.crs
        transform = src.transform
        width = src.width
        height = src.height
        count = src.count
        dtypes = src.dtypes
        nodata = src.nodata
        bounds = src.bounds
        res = src.res   # (pixel_width, pixel_height) in CRS units

        metadata_raw = dict(src.meta)
        # Remove driver/count for cleaner JSON
        metadata_raw.pop("driver", None)

        # Read first band for statistics
        data = src.read(1, masked=True)

    # Compute statistics
    if HAS_NUMPY:
        valid = data.compressed()
        stats = {
            "min_m": float(valid.min()) if len(valid) > 0 else None,
            "max_m": float(valid.max()) if len(valid) > 0 else None,
            "mean_m": float(valid.mean()) if len(valid) > 0 else None,
            "std_m": float(valid.std()) if len(valid) > 0 else None,
            "valid_pixels": int(len(valid)),
            "total_pixels": int(width * height),
            "nodata_pixels": int(width * height - len(valid)),
        }
    else:
        stats = {"note": "numpy not available; statistics not computed"}

    # Determine resolution in metres (approximate for geographic CRS)
    is_geographic = crs.is_geographic if crs else True
    if is_geographic:
        # GLO-30 is 1 arc-second = ~30 m at equator
        res_x_deg = abs(res[0])
        res_y_deg = abs(res[1])
        res_approx_m = res_x_deg * 111320  # degrees → metres at equator (approximate)
    else:
        res_approx_m = abs(res[0])  # projected CRS, units are in the CRS

    metadata = {
        "status": "OK",
        "source": str(DEM_PATH),
        "source_description": "Copernicus GLO-30 1 arc-second DEM (30 m resolution)",
        "crs": str(crs),
        "crs_is_geographic": is_geographic,
        "epsg": crs.to_epsg() if crs else None,
        "width_px": width,
        "height_px": height,
        "band_count": count,
        "dtype": str(dtypes[0]),
        "nodata": nodata,
        "pixel_size_crs_units": {
            "x": abs(res[0]),
            "y": abs(res[1]),
        },
        "pixel_size_approx_m": round(res_approx_m, 2),
        "extent": {
            "left": bounds.left,
            "bottom": bounds.bottom,
            "right": bounds.right,
            "top": bounds.top,
            "crs": str(crs),
        },
        "elevation_statistics": stats,
        "unit_assumption": (
            "Elevation values assumed to be in metres (standard for GLO-30). "
            "Confirm by cross-checking known ground control points in Chennai."
        ),
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    json_path = OUTPUT_DIR / "dem_metadata.json"
    with open(json_path, "w") as f:
        json.dump(metadata, f, indent=2)

    txt_path = OUTPUT_DIR / "dem_metadata.txt"
    with open(txt_path, "w") as f:
        f.write("CHENNAI DEM METADATA REPORT\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"Source:           {DEM_PATH}\n")
        f.write(f"Description:      Copernicus GLO-30 (~30 m resolution DEM)\n\n")
        f.write(f"CRS:              {crs}\n")
        f.write(f"Geographic:       {is_geographic}\n")
        f.write(f"EPSG:             {crs.to_epsg() if crs else 'N/A'}\n\n")
        f.write(f"Width  (pixels):  {width}\n")
        f.write(f"Height (pixels):  {height}\n")
        f.write(f"Bands:            {count}\n")
        f.write(f"Dtype:            {dtypes[0]}\n")
        f.write(f"NoData:           {nodata}\n\n")
        f.write(f"Pixel size (X):   {abs(res[0])} CRS units ≈ {res_approx_m:.0f} m\n")
        f.write(f"Pixel size (Y):   {abs(res[1])} CRS units ≈ {res_approx_m:.0f} m\n\n")
        f.write(f"Extent (left):    {bounds.left}\n")
        f.write(f"Extent (bottom):  {bounds.bottom}\n")
        f.write(f"Extent (right):   {bounds.right}\n")
        f.write(f"Extent (top):     {bounds.top}\n\n")
        if "valid_pixels" in stats:
            f.write(f"Valid pixels:     {stats['valid_pixels']:,}\n")
            f.write(f"NoData pixels:   {stats['nodata_pixels']:,}\n")
            f.write(f"Min elevation:   {stats['min_m']} m\n")
            f.write(f"Max elevation:   {stats['max_m']} m\n")
            f.write(f"Mean elevation:  {stats['mean_m']:.2f} m\n")
            f.write(f"Std elevation:   {stats['std_m']:.2f} m\n\n")
        f.write("NOTE: Elevation values assumed in metres (standard for GLO-30).\n")

    print(f"\n  CRS:              {crs}")
    print(f"  EPSG:             {crs.to_epsg() if crs else 'N/A'}")
    print(f"  Size:             {width} × {height} pixels")
    print(f"  Resolution:       ≈ {res_approx_m:.0f} m")
    print(f"  Extent:           {bounds.left:.4f}, {bounds.bottom:.4f} → {bounds.right:.4f}, {bounds.top:.4f}")
    if "min_m" in stats:
        print(f"  Elevation range:  {stats['min_m']} – {stats['max_m']} m")

    print(f"\n[OK] Metadata written:")
    print(f"  {json_path}")
    print(f"  {txt_path}")
    print("\n[DONE]")


if __name__ == "__main__":
    main()
