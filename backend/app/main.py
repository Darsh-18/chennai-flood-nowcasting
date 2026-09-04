from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers import (
    critical_infrastructure,
    data_status,
    drainage,
    flood_state,
    forecast,
    health,
    map_layers,
    nowcast,
    route,
    scenario,
    weather,
)

app = FastAPI(
    title="Chennai Urban Flood Nowcasting Prototype",
    description="Reduced-order demonstration model for SIH26085.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "message": "Request validation failed. Check scenario fields and allowed option values.",
            "detail": exc.errors(),
        },
    )


app.include_router(scenario.router)
app.include_router(nowcast.router)
app.include_router(flood_state.router)
app.include_router(forecast.router)
app.include_router(drainage.router)
app.include_router(route.router)
app.include_router(data_status.router)
app.include_router(critical_infrastructure.router)
app.include_router(health.router)
app.include_router(map_layers.router)
app.include_router(weather.router)
