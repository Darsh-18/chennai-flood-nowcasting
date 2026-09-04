from pathlib import Path
import h5py
import numpy as np
import pandas as pd

INPUT = Path("data/raw/rainfall/chennai_imerg_2015.nc")
OUTPUT = Path("data/rainfall/chennai_imerg_2015.csv")

OUTPUT.parent.mkdir(parents=True, exist_ok=True)

# Load the NetCDF4/HDF5 IMERG file without requiring an xarray backend.
with h5py.File(INPUT, "r") as ds:
    rain = ds["precipitation"][:]
    time_values = ds["time"][:]
    time_units = ds["time"].attrs["units"]

if isinstance(time_units, bytes):
    time_units = time_units.decode("utf-8")
time_prefix = "hours since "
if not time_units.startswith(time_prefix):
    raise ValueError(f"Unsupported IMERG time units: {time_units!r}")

# Precipitation is time × latitude × longitude.  The pilot model consumes one
# spatially averaged rain-gage series.
timestamps = pd.Timestamp(time_units.removeprefix(time_prefix)) + pd.to_timedelta(
    time_values, unit="h"
)
df = pd.DataFrame(
    {
        "timestamp": timestamps,
        "rainfall_mm": np.nanmean(rain, axis=(1, 2)),
    }
)

# IMERG is a precipitation rate in mm/hr.  The SWMM rain gage uses the
# INTENSITY format, so retain these values and the original IMERG timestamps.
# Do not interpolate 30-minute observations to 15-minute values: doing so
# would create synthetic intermediate rainfall rates.  A source timestamp gap,
# if present, is deliberately retained for traceability.

# Remove invalid values
df["rainfall_mm"] = pd.to_numeric(df["rainfall_mm"], errors="coerce")
df["rainfall_mm"] = df["rainfall_mm"].clip(lower=0)
df = df.dropna()
df = df.sort_values("timestamp")

# SWMM rainfall.py requires this timestamp format
df["timestamp"] = df["timestamp"].dt.strftime("%m/%d/%Y %H:%M")

df.to_csv(OUTPUT, index=False)

print(f"Created: {OUTPUT}")
print(f"Rows: {len(df)}")
print("\nFirst 10 rows:")
print(df.head(10).to_string(index=False))

print("\nRainfall statistics:")
print(df["rainfall_mm"].describe())
