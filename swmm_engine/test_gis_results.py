"""Integration checks for GIS-ready, backward-compatible SWMM results."""

import asyncio
import json
import unittest
from pathlib import Path
from unittest.mock import patch

from swmm_engine.api import SimulationRequest, simulate
from swmm_engine.rainfall import inject_rainfall
from swmm_engine.runner import prepare_scenario_inp, run_swmm_simulation


BASE_INP = "swmm_engine/models/pilot_network.inp"
IMERG_CSV = "data/rainfall/chennai_imerg_2015.csv"
OUTPUTS = Path("swmm_engine/outputs")


class SwmmGisResultsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.addCleanup(self._remove_test_artifacts)

    @staticmethod
    def _remove_test_artifacts() -> None:
        """Keep simulated .inp/.out/.rpt files out of the working tree."""
        for stem in (
            "prepared_normal",
            "prepared_reduced_capacity",
            "prepared_severe_blockage",
            "test_gis_imerg_scenario",
            "test_gis_imerg",
        ):
            for suffix in (".inp", ".out", ".rpt"):
                (OUTPUTS / f"{stem}{suffix}").unlink(missing_ok=True)

    def test_all_scenarios_execute_and_preserve_legacy_fields(self) -> None:
        """Every configured scenario runs and the old result fields remain."""
        for scenario in ("normal", "reduced_capacity", "severe_blockage"):
            with self.subTest(scenario=scenario):
                result = run_swmm_simulation(
                    inp_path=BASE_INP,
                    scenario_name=scenario,
                )
                self.assertEqual(result["status"], "success")
                self.assertEqual(result["scenario"], scenario)
                self.assertIn("summary", result)
                self.assertIn("maximum_depth_m", result["summary"])
                self.assertIn("max_system_depth_m", result)
                self.assertTrue(result["nodes"])
                self.assertTrue(result["conduits"])

    def test_real_imerg_rainfall_is_injected_with_provenance(self) -> None:
        """The tracked IMERG CSV remains usable as an externally sourced event."""
        scenario_inp = OUTPUTS / "test_gis_imerg_scenario.inp"
        injected_inp = OUTPUTS / "test_gis_imerg.inp"
        prepare_scenario_inp(BASE_INP, str(scenario_inp), "normal")
        inject_rainfall(IMERG_CSV, str(scenario_inp), str(injected_inp))

        result = run_swmm_simulation(
            inp_path=str(injected_inp),
            scenario_name="normal",
            scenario_applied=True,
            rainfall_csv_path=IMERG_CSV,
        )

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["rainfall_event"]["event_id"], "chennai_imerg_2015")
        self.assertEqual(result["rainfall_event"]["source_path"], IMERG_CSV)

    def test_nodes_and_conduits_have_gis_contract_fields_and_json_is_valid(self) -> None:
        result = run_swmm_simulation(inp_path=BASE_INP, scenario_name="normal")
        self.assertEqual(result["status"], "success")

        node = next(item for item in result["nodes"] if item["node_id"] == "J1")
        self.assertEqual(node["id"], "J1")  # existing response contract
        self.assertEqual(node["x"], 80.2707)
        self.assertEqual(node["y"], 13.0827)
        self.assertIsNone(node["latitude"])
        self.assertIsNone(node["longitude"])
        for field in (
            "node_id", "x", "y", "latitude", "longitude", "max_depth_m",
            "max_flooding_cms", "flooded",
        ):
            self.assertIn(field, node)

        conduit = next(item for item in result["conduits"] if item["conduit_id"] == "C1")
        self.assertEqual(conduit["id"], "C1")  # existing response contract
        self.assertEqual(conduit["from_node"], "J1")
        self.assertEqual(conduit["to_node"], "J2")
        self.assertIn("max_flow_cms", conduit)
        self.assertIsNotNone(result["simulation_start"])
        self.assertIsNotNone(result["simulation_end"])
        self.assertEqual(json.loads(json.dumps(result))["status"], "success")

    def test_api_endpoint_returns_the_additive_contract(self) -> None:
        """The public endpoint returns the runner contract without removing fields."""
        expected = {
            "status": "success",
            "scenario": "normal",
            "simulation_start": "2015-11-28T00:00:00",
            "nodes": [{"id": "J1", "node_id": "J1"}],
        }
        with patch("swmm_engine.api.run_swmm_simulation", return_value=expected) as runner:
            result = asyncio.run(simulate(SimulationRequest(scenario="normal")))
        self.assertTrue(runner.called)
        self.assertEqual(result["status"], "success")
        self.assertIn("id", result["nodes"][0])
        self.assertIn("node_id", result["nodes"][0])
        self.assertIn("simulation_start", result)


if __name__ == "__main__":
    unittest.main()
