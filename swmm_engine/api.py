"""
api.py
------
Exposes the SWMM simulation engine as a FastAPI REST endpoint.

Endpoint
--------
    POST /api/v1/swmm/simulate

Run locally
-----------
    python -m swmm_engine.api
    # or:
    uvicorn swmm_engine.api:app --reload --host 0.0.0.0 --port 8000
"""

from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from swmm_engine.rainfall import inject_rainfall
from swmm_engine.runner import prepare_scenario_inp, run_swmm_simulation

# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Chennai Flood Nowcasting – SWMM Engine API",
    description=(
        "Run SWMM hydraulic simulations for the pilot drainage network. "
        "Optionally inject real-time rainfall from a CSV before simulating."
    ),
    version="0.1.0",
)

# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class SimulationRequest(BaseModel):
    """Payload accepted by the /simulate endpoint."""

    scenario: str = Field(
        default="normal",
        description="Drainage scenario to simulate.",
        examples=["normal", "reduced_capacity", "severe_blockage"],
    )
    rainfall_csv_path: Optional[str] = Field(
        default=None,
        description=(
            "Absolute or relative path to a CSV file with columns "
            "'timestamp' (MM/DD/YYYY HH:MM) and 'rainfall_mm'. "
            "When provided, rainfall data is injected into the model "
            "before the simulation runs."
        ),
        examples=[None, "data/rainfall/2023_event.csv"],
    )

# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@app.post(
    "/api/v1/swmm/simulate",
    summary="Run a SWMM simulation",
    response_description="Simulation result dictionary with status and metrics.",
)
async def simulate(request: SimulationRequest) -> dict:
    """
    Run a SWMM hydraulic simulation for the given scenario.

    - **scenario**: one of `normal`, `reduced_capacity`, `severe_blockage`.
    - **rainfall_csv_path**: optional path to a rainfall CSV.  When supplied,
      the CSV is validated and injected into the model before the run.
    """

    # Build a scenario-specific model before rainfall injection. The base
    # template remains unchanged and PySWMM never mutates conduit roughness.
    base_inp_path: str = "swmm_engine/models/pilot_network.inp"
    scenario_inp_path: str = f"swmm_engine/outputs/scenario_{request.scenario}.inp"
    try:
        prepare_scenario_inp(
            base_inp_path=base_inp_path,
            target_inp_path=scenario_inp_path,
            scenario_name=request.scenario,
        )
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    inp_path: str = scenario_inp_path

    # ------------------------------------------------------------------
    # Optional rainfall injection
    # ------------------------------------------------------------------
    if request.rainfall_csv_path is not None:
        temp_inp_path: str = (
            f"swmm_engine/outputs/temp_injected_{request.scenario}.inp"
        )

        try:
            inject_rainfall(
                csv_path=request.rainfall_csv_path,
                base_inp_path=scenario_inp_path,
                target_inp_path=temp_inp_path,
            )
        except FileNotFoundError as exc:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"File not found during rainfall injection: {exc}. "
                    "Check that both 'rainfall_csv_path' and the base .inp "
                    "template exist on the server."
                ),
            ) from exc
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid rainfall data: {exc}",
            ) from exc

        # Use the injected model for this run
        inp_path = temp_inp_path

    # ------------------------------------------------------------------
    # Run simulation
    # ------------------------------------------------------------------
    result: dict = run_swmm_simulation(
        inp_path=inp_path,
        scenario_name=request.scenario,
        scenario_applied=True,
        rainfall_csv_path=request.rainfall_csv_path,
    )

    # ------------------------------------------------------------------
    # Surface engine-level failures as HTTP 500
    # ------------------------------------------------------------------
    if result.get("status") == "failed":
        raise HTTPException(
            status_code=500,
            detail={
                "message": "SWMM simulation failed.",
                "engine_error": result.get("error", "No additional details returned."),
                "scenario": request.scenario,
                "inp_path": inp_path,
            },
        )

    return result

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
