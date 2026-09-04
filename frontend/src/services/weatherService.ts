export interface LiveWeatherData {
  temperature: number;
  apparentTemperature?: number;
  precipitation: number;
  rain: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
  weatherDescription: string;
  isLive: boolean;
  timestamp: string;
}

const WMO_CODE_MAP: Record<number, string> = {
  0: "Clear Sky",
  1: "Mainly Clear",
  2: "Partly Cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing Rime Fog",
  51: "Light Drizzle",
  53: "Moderate Drizzle",
  55: "Dense Drizzle",
  61: "Slight Rain",
  63: "Moderate Rain",
  65: "Heavy Rain",
  71: "Slight Snow",
  73: "Moderate Snow",
  75: "Heavy Snow",
  80: "Slight Rain Showers",
  81: "Moderate Rain Showers",
  82: "Violent Rain Showers",
  95: "Thunderstorm",
  96: "Thunderstorm with Slight Hail",
  99: "Thunderstorm with Heavy Hail",
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function fetchChennaiWeather(): Promise<LiveWeatherData> {
  // 1. First try the backend OpenWeather adapter (backed by OPENWEATHER_API_KEY)
  try {
    const backendResp = await fetch(`${API_BASE}/api/weather`);
    if (backendResp.ok) {
      const data = await backendResp.json();
      if (data && data.isLive) {
        return {
          temperature: Number(data.temperature ?? 28),
          apparentTemperature: Number(data.apparentTemperature ?? 30),
          precipitation: Number(data.precipitation ?? 0),
          rain: Number(data.rain ?? 0),
          humidity: Number(data.humidity ?? 75),
          windSpeed: Number(data.windSpeed ?? 12),
          windDirection: Number(data.windDirection ?? 0),
          weatherCode: Number(data.weatherCode ?? 800),
          weatherDescription: String(data.weatherDescription ?? "Fair"),
          isLive: true,
          timestamp: String(data.timestamp ?? new Date().toISOString()),
        };
      }
    }
  } catch {
    // Backend fetch failed; fall through to direct public fallback
  }

  // 2. Direct fallback via Open-Meteo
  const lat = 13.0827;
  const lon = 80.2707;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m&timezone=Asia%2FKolkata`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Open-Meteo HTTP error: ${resp.status}`);
  }

  const json = await resp.json();
  const current = json.current;
  if (!current) {
    throw new Error("Missing current weather in response");
  }

  const code = Number(current.weather_code ?? 0);
  const description = WMO_CODE_MAP[code] ?? (current.rain > 0 ? "Rainy" : "Fair");

  return {
    temperature: Math.round(Number(current.temperature_2m ?? 28)),
    apparentTemperature: Math.round(Number(current.apparent_temperature ?? 30)),
    precipitation: Number(current.precipitation ?? 0),
    rain: Number(current.rain ?? 0),
    humidity: Math.round(Number(current.relative_humidity_2m ?? 75)),
    windSpeed: Math.round(Number(current.wind_speed_10m ?? 12)),
    windDirection: Math.round(Number(current.wind_direction_10m ?? 0)),
    weatherCode: code,
    weatherDescription: description,
    isLive: true,
    timestamp: current.time ?? new Date().toISOString(),
  };
}
