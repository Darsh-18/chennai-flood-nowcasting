import { useEffect, useState } from "react";
import { useFloodStore } from "../state/FloodStore";
import { fetchChennaiWeather, type LiveWeatherData } from "../services/weatherService";

export default function TopBar() {
  const { scenario, setScenario, setInfoOpen, health } = useFloodStore();
  const [weather, setWeather] = useState<LiveWeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Weather fetch
  useEffect(() => {
    let mounted = true;
    fetchChennaiWeather()
      .then((data) => {
        if (mounted) {
          setWeather(data);
          setWeatherLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Weather fetch error:", err);
        if (mounted) {
          setWeatherError(true);
          setWeatherLoading(false);
        }
      });

    // Refresh weather every 10 minutes
    const interval = setInterval(() => {
      fetchChennaiWeather()
        .then((d) => mounted && setWeather(d))
        .catch(() => {});
    }, 600000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const timeString = currentTime.toLocaleTimeString("en-GB", { hour12: false });
  const dateString = currentTime.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const scenarioColor =
    scenario.rainfall_intensity === "extreme"
      ? "text-red-400"
      : scenario.rainfall_intensity === "heavy"
      ? "text-orange-400"
      : "text-cyan-400";

  const drainageColor =
    scenario.drainage_condition === "severe"
      ? "text-red-400"
      : scenario.drainage_condition === "degraded"
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <header className="fixed top-3 left-4 right-4 z-30 h-14 flex items-center justify-between rounded-2xl border border-white/10 bg-[#0d1527]/95 backdrop-blur-xl px-5 shadow-2xl">
      {/* Left: Brand + Quick Scenario Info */}
      <div className="flex items-center gap-5">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/30 text-cyan-400 shadow-inner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L3 7v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" />
              <path d="M12 9v5M9 11.5h6" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-base font-extrabold tracking-wider text-white">
              AQUANEX
            </h1>
          </div>
        </div>

        {/* Quick Scenario Status (Reference image style) */}
        <div className="hidden xl:flex items-center gap-4 pl-4 border-l border-white/10 text-xs">
          <div>
            <div className="text-[9px] uppercase font-mono tracking-wider text-ink-500">SCENARIO</div>
            <div className={`font-bold capitalize ${scenarioColor}`}>
              {scenario.rainfall_intensity} Rainfall
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase font-mono tracking-wider text-ink-500">DRAINAGE</div>
            <div className={`font-bold capitalize ${drainageColor}`}>
              {scenario.drainage_condition}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase font-mono tracking-wider text-ink-500">HORIZON</div>
            <div className="font-bold text-cyan-400">
              T+{scenario.forecast_minutes} min
            </div>
          </div>
        </div>
      </div>

      {/* Center: Live Clock */}
      <div className="hidden md:flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-mono text-[10px] font-bold text-emerald-400 tracking-wider">LIVE</span>
        </div>
        <div className="font-mono text-sm font-bold text-white tracking-widest">{timeString}</div>
        <div className="text-xs text-ink-400 font-medium">{dateString}</div>
      </div>

      {/* Right: Weather + Info + Demo badge */}
      <div className="flex items-center gap-4">
        {/* Weather Widget */}
        <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-1.5">
          {weatherLoading ? (
            <div className="flex items-center gap-2 text-xs text-ink-400">
              <span className="animate-spin h-3 w-3 border-2 border-cyan-400 border-t-transparent rounded-full" />
              <span>Checking weather…</span>
            </div>
          ) : weather && weather.isLive ? (
            <div className="flex items-center gap-3.5">
              <div className="flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="8" y1="19" x2="8" y2="21" strokeLinecap="round" />
                  <line x1="12" y1="17" x2="12" y2="21" strokeLinecap="round" />
                  <line x1="16" y1="19" x2="16" y2="21" strokeLinecap="round" />
                </svg>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">{weather.temperature}°C</span>
                    <span className="rounded-xs bg-cyan-500/20 px-1 py-0.2 text-[8px] font-mono font-bold text-cyan-400 uppercase">
                      LIVE
                    </span>
                  </div>
                  <div className="text-[10px] text-ink-400 leading-none">{weather.weatherDescription}</div>
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-3 text-[11px] text-ink-300 border-l border-white/10 pl-3">
                <div>
                  <span className="text-[9px] uppercase text-ink-500 block font-mono">Rainfall</span>
                  <span className="font-bold text-white">{weather.rain > 0 ? `${weather.rain.toFixed(1)} mm/h` : "0.0 mm/h"}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-ink-500 block font-mono">Wind</span>
                  <span className="font-bold text-white">{weather.windSpeed} km/h</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-ink-500 block font-mono">Humidity</span>
                  <span className="font-bold text-white">{weather.humidity}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-400 font-mono">WEATHER UNAVAILABLE</div>
          )}
        </div>

        {/* Info button */}
        <button
          onClick={() => setInfoOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-ink-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          <span>INFO</span>
        </button>

        {/* DEMO mode pill */}
        <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-400 font-mono">
          <span>{health?.mode ?? "DEMO"}</span>
        </div>
      </div>
    </header>
  );
}
