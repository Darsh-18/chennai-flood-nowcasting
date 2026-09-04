from __future__ import annotations

import json
import logging
import os
import urllib.request
from pathlib import Path
from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["weather"])
LOGGER = logging.getLogger(__name__)

# Coordinates for Chennai center
CHENNAI_LAT = 13.0827
CHENNAI_LON = 80.2707


def _get_api_key() -> str:
    key = os.getenv("OPENWEATHER_API_KEY", "").strip()
    if not key:
        env_file = Path(__file__).resolve().parents[2] / ".env"
        if env_file.is_file():
            try:
                for line in env_file.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if line.startswith("OPENWEATHER_API_KEY="):
                        key = line.split("=", 1)[1].strip()
                        break
            except Exception as e:
                LOGGER.warning("Could not read .env: %s", e)
    return key


@router.get("/weather")
def get_current_weather() -> dict[str, Any]:
    key = _get_api_key()
    if not key:
        return {"isLive": False, "error": "OPENWEATHER_API_KEY not configured"}

    url = f"https://api.openweathermap.org/data/2.5/weather?lat={CHENNAI_LAT}&lon={CHENNAI_LON}&appid={key}&units=metric"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "AQUANEX-ChennaiFlood/1.0"})
        with urllib.request.urlopen(req, timeout=8) as response:
            raw = json.loads(response.read().decode("utf-8"))

        main = raw.get("main", {})
        wind = raw.get("wind", {})
        rain_data = raw.get("rain", {})
        weather_arr = raw.get("weather", [{}])

        rain_1h = float(rain_data.get("1h", 0.0)) if isinstance(rain_data, dict) else 0.0
        desc = weather_arr[0].get("description", "Clear") if weather_arr else "Clear"
        code = weather_arr[0].get("id", 800) if weather_arr else 800

        return {
            "temperature": round(main.get("temp", 28)),
            "apparentTemperature": round(main.get("feels_like", 30)),
            "precipitation": rain_1h,
            "rain": rain_1h,
            "humidity": round(main.get("humidity", 75)),
            "windSpeed": round(float(wind.get("speed", 0)) * 3.6),
            "windDirection": round(float(wind.get("deg", 0))),
            "weatherCode": code,
            "weatherDescription": desc.title(),
            "isLive": True,
            "timestamp": str(raw.get("dt", "")),
        }
    except Exception as exc:
        LOGGER.error("OpenWeather request failed: %s", exc)
        return {"isLive": False, "error": str(exc)}
