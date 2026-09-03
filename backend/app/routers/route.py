from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import RouteRequest, RouteResponse
from app.services import route_for_request

router = APIRouter(prefix="/api", tags=["route"])


@router.post("/route", response_model=RouteResponse)
def route(request: RouteRequest) -> RouteResponse:
    try:
        return route_for_request(request.start_infra_id, request.end_infra_id, request.scenario)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
