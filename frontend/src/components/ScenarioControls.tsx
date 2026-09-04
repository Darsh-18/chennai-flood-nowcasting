import { useState } from "react";
import { useFloodStore } from "../state/FloodStore";
import type { DrainageCondition, ForecastMinutes, RainfallIntensity } from "../types/api";

export default function ScenarioControls() {
  const { scenario, setScenario, options, runNowcast, loading, error, clearError } = useFloodStore();
  const [collapsed, setCollapsed] = useState(false);

  const rainOptions = options?.rainfall_intensity ?? (["moderate", "heavy", "extreme"] as RainfallIntensity[]);
  const drainageOptions = options?.drainage_condition ?? (["normal", "degraded", "severe"] as DrainageCondition[]);
  const horizonOptions = options?.forecast_minutes ?? ([30, 60, 120, 180] as ForecastMinutes[]);

  if (collapsed) {
    return (
      <div className="w-[260px] rounded-2xl border border-white/10 bg-[#0d1527]/90 backdrop-blur-xl p-3 shadow-2xl flex items-center justify-between">
        <span className="font-display text-[11px] font-bold uppercase tracking-wider text-ink-300">
          SCENARIO CONTROLS
        </span>
        <button
          onClick={() => setCollapsed(false)}
          className="rounded-lg p-1 text-ink-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-[260px] shrink-0 rounded-2xl border border-white/10 bg-[#0d1527]/90 backdrop-blur-xl shadow-2xl overflow-hidden transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <span className="font-display text-[11px] font-bold uppercase tracking-wider text-ink-300">
          SCENARIO CONTROLS
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="rounded-lg p-1 text-ink-400 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Collapse scenario controls"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Rainfall */}
        <div>
          <div className="mb-1 text-[10px] font-mono uppercase tracking-wider text-ink-400">
            RAINFALL
          </div>
          <div className="grid grid-cols-3 gap-1">
            {rainOptions.map((item) => {
              const active = scenario.rainfall_intensity === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    clearError();
                    setScenario((c) => ({ ...c, rainfall_intensity: item }));
                  }}
                  className={`rounded-lg py-1.5 text-xs font-semibold capitalize transition-all ${active
                    ? item === "extreme"
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                      : "bg-cyan-500 text-ink-950 font-bold shadow-lg shadow-cyan-500/20"
                    : "bg-white/[0.04] text-ink-300 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Drainage */}
        <div>
          <div className="mb-1 text-[10px] font-mono uppercase tracking-wider text-ink-400">
            DRAINAGE
          </div>
          <div className="grid grid-cols-3 gap-1">
            {drainageOptions.map((item) => {
              const active = scenario.drainage_condition === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    clearError();
                    setScenario((c) => ({ ...c, drainage_condition: item }));
                  }}
                  className={`rounded-lg py-1.5 text-xs font-semibold capitalize transition-all ${active
                    ? item === "degraded"
                      ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500 shadow-md shadow-amber-500/20"
                      : item === "severe"
                        ? "bg-red-500/20 text-red-300 ring-1 ring-red-500 shadow-md shadow-red-500/20"
                        : "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500 shadow-md shadow-emerald-500/20"
                    : "bg-white/[0.04] text-ink-300 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Horizon */}
        <div>
          <div className="mb-1 text-[10px] font-mono uppercase tracking-wider text-ink-400">
            HORIZON
          </div>
          <div className="grid grid-cols-4 gap-1">
            {horizonOptions.map((item) => {
              const active = scenario.forecast_minutes === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    clearError();
                    setScenario((c) => ({ ...c, forecast_minutes: item }));
                  }}
                  className={`rounded-lg py-1 text-xs font-semibold transition-all ${active
                    ? "bg-cyan-500 text-ink-950 font-bold shadow-md shadow-cyan-500/30"
                    : "bg-white/[0.04] text-ink-300 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  T+{item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error notice */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-400">
            {error}
          </div>
        )}

        {/* Run Nowcast Primary Button */}
        <button
          type="button"
          onClick={() => void runNowcast()}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-4 py-2.5 font-display text-xs font-extrabold uppercase tracking-wider text-ink-950 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-60 cursor-pointer"
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 4v4M12 16v4M4 12H8M16 12h4M6.34 6.34l2.83 2.83M14.83 14.83l2.83 2.83M17.66 6.34l-2.83 2.83M9.17 14.83l-2.83 2.83" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          )}
          {loading ? "COMPUTING…" : "RUN NOWCAST"}
        </button>
      </div>
    </div>
  );
}
