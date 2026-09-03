from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import NowcastRequest, NowcastResponse
from app.services import get_nowcast

router = APIRouter(prefix="/api", tags=["nowcast"])


@router.post("/nowcast", response_model=NowcastResponse)
def run_nowcast(request: NowcastRequest) -> NowcastResponse:
    return get_nowcast(request)
