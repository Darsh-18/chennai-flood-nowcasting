"""
rainfall.py
-----------
Parses CSV rainfall data and injects it into a SWMM .inp template file.

Public API
----------
    inject_rainfall(csv_path, base_inp_path, target_inp_path, ts_name="TS_RAIN")
"""

import csv
import os


def inject_rainfall(
    csv_path: str,
    base_inp_path: str,
    target_inp_path: str,
    ts_name: str = "TS_RAIN",
) -> None:
    """
    Parse a rainfall CSV and inject its data into a SWMM .inp template file.

    Parameters
    ----------
    csv_path : str
        Path to the CSV file with columns ``timestamp`` (MM/DD/YYYY HH:MM)
        and ``rainfall_mm``.
    base_inp_path : str
        Path to the SWMM template .inp file to use as the base.
    target_inp_path : str
        Path where the modified .inp file will be written.
    ts_name : str, optional
        Name of the SWMM time-series entry to inject (default: "TS_RAIN").

    Raises
    ------
    FileNotFoundError
        If ``csv_path`` or ``base_inp_path`` does not exist on disk.
    ValueError
        If any ``rainfall_mm`` value in the CSV is negative.
    """

    # ------------------------------------------------------------------
    # 1. Validate input paths exist before doing any work
    # ------------------------------------------------------------------
    if not os.path.exists(csv_path):
        raise FileNotFoundError(
            f"Rainfall CSV not found: '{csv_path}'"
        )
    if not os.path.exists(base_inp_path):
        raise FileNotFoundError(
            f"SWMM template .inp not found: '{base_inp_path}'"
        )

    # ------------------------------------------------------------------
    # 2. Read and validate the rainfall CSV
    # ------------------------------------------------------------------
    rainfall_rows: list[str] = []  # lines ready to drop into [TIMESERIES]

    with open(csv_path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for line_num, row in enumerate(reader, start=2):  # row 1 = header
            timestamp: str = row["timestamp"].strip()
            raw_value: str = row["rainfall_mm"].strip()

            value = float(raw_value)

            if value < 0:
                raise ValueError(
                    f"Negative rainfall value detected. "
                    f"(row {line_num}: timestamp={timestamp}, rainfall_mm={value})"
                )

            # Split "MM/DD/YYYY HH:MM" → date and time parts for SWMM format
            parts = timestamp.split()
            date_part = parts[0]          # MM/DD/YYYY
            time_part = parts[1] if len(parts) > 1 else "00:00"  # HH:MM

            # SWMM timeseries format: <Name>  <Date>  <Time>  <Value>
            rainfall_rows.append(
                f"{ts_name}  {date_part}  {time_part}  {value}"
            )

    # ------------------------------------------------------------------
    # 3. Read the base .inp template and rebuild with injected data
    # ------------------------------------------------------------------
    with open(base_inp_path, encoding="utf-8") as fh:
        base_lines: list[str] = fh.readlines()

    output_lines: list[str] = []
    in_timeseries_section = False

    for raw_line in base_lines:
        stripped = raw_line.strip()

        # Detect section headers (e.g. "[TIMESERIES]", "[JUNCTIONS]", …)
        if stripped.startswith("["):
            if stripped.upper() == "[TIMESERIES]":
                in_timeseries_section = True
                # Write the header, then immediately inject new rows
                output_lines.append(raw_line)
                for ts_line in rainfall_rows:
                    output_lines.append(ts_line + "\n")
                continue
            else:
                # Leaving the [TIMESERIES] section
                in_timeseries_section = False

        if in_timeseries_section:
            # Drop any pre-existing entry for this ts_name; keep others
            if stripped.startswith(ts_name):
                continue  # skip stale entry

        output_lines.append(raw_line)

    # ------------------------------------------------------------------
    # 4. Write the modified content to the target path
    # ------------------------------------------------------------------
    target_dir = os.path.dirname(target_inp_path)
    if target_dir:
        os.makedirs(target_dir, exist_ok=True)

    with open(target_inp_path, "w", encoding="utf-8") as fh:
        fh.writelines(output_lines)
