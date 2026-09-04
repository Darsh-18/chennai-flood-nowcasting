"""
test_pipeline.py
----------------
Verifies the SWMM engine runner across different scenarios:
  1. Normal scenario  → expects status == "success"
  2. Severe-blockage scenario → expects status == "success"
  3. Max-depth comparison → severe_blockage depth >= normal depth
  4. Invalid inp_path → expects status == "failed"
"""

from swmm_engine.runner import run_swmm_simulation


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _header(title: str) -> None:
    """Print a section header."""
    bar = "=" * 60
    print(f"\n{bar}")
    print(f"  {title}")
    print(bar)


def _pass(msg: str) -> None:
    print(f"  [PASS]  {msg}")


def _fail(msg: str) -> None:
    print(f"  [FAIL]  {msg}")


def _info(msg: str) -> None:
    print(f"  [INFO]  {msg}")


# ---------------------------------------------------------------------------
# Test suite
# ---------------------------------------------------------------------------

def run_tests() -> None:
    """Run all SWMM pipeline tests and print a human-readable summary."""

    results = {"passed": 0, "failed": 0}

    # ------------------------------------------------------------------
    # Test 1 – Normal scenario
    # ------------------------------------------------------------------
    _header("Test 1 | Scenario: normal")
    result_normal = run_swmm_simulation(scenario_name="normal")
    _info(f"Returned: {result_normal}")

    try:
        assert result_normal.get("status") == "success", (
            f"Expected status='success', got '{result_normal.get('status')}'"
        )
        _pass("status == 'success'")
        results["passed"] += 1
    except AssertionError as exc:
        _fail(str(exc))
        results["failed"] += 1

    # ------------------------------------------------------------------
    # Test 2 – Severe blockage scenario
    # ------------------------------------------------------------------
    _header("Test 2 | Scenario: severe_blockage")
    result_severe = run_swmm_simulation(scenario_name="severe_blockage")
    _info(f"Returned: {result_severe}")

    try:
        assert result_severe.get("status") == "success", (
            f"Expected status='success', got '{result_severe.get('status')}'"
        )
        _pass("status == 'success'")
        results["passed"] += 1
    except AssertionError as exc:
        _fail(str(exc))
        results["failed"] += 1

    # ------------------------------------------------------------------
    # Test 3 – Max-depth comparison
    # ------------------------------------------------------------------
    _header("Test 3 | Max system depth: severe_blockage >= normal")

    depth_normal = result_normal.get("max_system_depth_m")
    depth_severe = result_severe.get("max_system_depth_m")
    _info(f"Max depth (normal):          {depth_normal} m")
    _info(f"Max depth (severe_blockage): {depth_severe} m")

    try:
        assert depth_normal is not None and depth_severe is not None, (
            "One or both results are missing 'max_system_depth_m'."
        )
        assert depth_severe >= depth_normal, (
            f"Expected severe_blockage depth ({depth_severe}) "
            f">= normal depth ({depth_normal})."
        )
        _pass(f"severe_blockage depth ({depth_severe} m) >= normal depth ({depth_normal} m)")
        results["passed"] += 1
    except AssertionError as exc:
        _fail(str(exc))
        results["failed"] += 1

    # ------------------------------------------------------------------
    # Test 4 – Invalid inp_path → should return status == "failed"
    # ------------------------------------------------------------------
    _header("Test 4 | Invalid inp_path → expected status='failed'")
    result_invalid = run_swmm_simulation(
        scenario_name="normal",
        inp_path="invalid_path.inp",
    )
    _info(f"Returned: {result_invalid}")

    try:
        assert result_invalid.get("status") == "failed", (
            f"Expected status='failed', got '{result_invalid.get('status')}'"
        )
        _pass("status == 'failed' for invalid inp_path")
        results["passed"] += 1
    except AssertionError as exc:
        _fail(str(exc))
        results["failed"] += 1

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    _header("Test Summary")
    total = results["passed"] + results["failed"]
    print(f"  Tests run   : {total}")
    print(f"  Passed      : {results['passed']}")
    print(f"  Failed      : {results['failed']}")
    if results["failed"] == 0:
        print("\n  ✓ All tests passed.")
    else:
        print(f"\n  ✗ {results['failed']} test(s) failed — review output above.")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    run_tests()
