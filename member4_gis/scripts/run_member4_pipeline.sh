#!/bin/bash
# run_member4_pipeline.sh
# -----------------------
# Execute the full Member 4 SWMM+GIS pipeline.
#
# Usage (from project root):
#   bash member4_gis/scripts/run_member4_pipeline.sh
#
# Requires:
#   backend/.venv with pyswmm, geopandas, rasterio, h5py installed.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VENV_PYTHON="$PROJECT_ROOT/backend/.venv/bin/python3"
PYTHONPATH="$PROJECT_ROOT"

echo "======================================================================"
echo "  Member 4 Pipeline Runner"
echo "  Project: $PROJECT_ROOT"
echo "  Python:  $VENV_PYTHON"
echo "======================================================================"

if [ ! -f "$VENV_PYTHON" ]; then
    echo "[ERROR] Virtual environment not found: $VENV_PYTHON"
    exit 1
fi

export PYTHONPATH

run_script() {
    local name="$1"
    local script="$2"
    echo ""
    echo "----------------------------------------------------------------------"
    echo "  Running: $name"
    echo "----------------------------------------------------------------------"
    if PYTHONPATH="$PROJECT_ROOT" "$VENV_PYTHON" "$script" 2>&1; then
        echo "  [OK] $name completed."
    else
        echo "  [WARN] $name exited with an error (see output above). Continuing..."
    fi
}

# Step 1: SWMM → GIS
run_script "SWMM to GIS" "$PROJECT_ROOT/member4_gis/scripts/swmm_to_gis.py"

# Step 2: DEM Inspector
run_script "DEM Inspector" "$PROJECT_ROOT/member4_gis/scripts/dem_inspector.py"

# Step 3: Historical Flood Processor
run_script "Historical Flood Processor" "$PROJECT_ROOT/member4_gis/scripts/historical_flood_processor.py"

# Step 4: Road Impact
run_script "Road Impact Assessment" "$PROJECT_ROOT/member4_gis/scripts/road_impact.py"

# Step 5: Validation
run_script "Spatial Validation" "$PROJECT_ROOT/member4_gis/scripts/validation.py"

echo ""
echo "======================================================================"
echo "  Pipeline complete. Check member4_gis/outputs/ for results."
echo "======================================================================"
