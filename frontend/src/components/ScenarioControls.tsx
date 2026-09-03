import { Clock, CloudRain, RefreshCw, Workflow } from "lucide-react";
import { useFloodStore } from "../state/FloodStore";
import type { DrainageCondition, ForecastMinutes, RainfallIntensity } from "../types/api";

const RAIN_LABELS: Record<RainfallIntensity, string> = {
  moderate: "Moderate",
  heavy: "Heavy",
  extreme: "Extreme",
};

const DRAINAGE_LABELS: Record<DrainageCondition, string> = {
  normal: "Normal",
  degraded: "Degraded",
  severe: "Severe",
};

function buttonClass(active: boolean) {
  return `border px-3 py-2 text-sm font-semibold transition ${
    active
      ? "border-ops-accent bg-ops-accent text-white"
      : "border-ops-line bg-white/70 text-ops-ink hover:border-ops-accent"
  }`;
}

export default function ScenarioControls() {
  const { scenario, setScenario, options, runNowcast, loading, error, clearError } = useFloodStore();
  const rainOptions = options?.rainfall_intensity ?? (["moderate", "heavy", "extreme"] as RainfallIntensity[]);
  const drainageOptions = options?.drainage_condition ?? (["normal", "degraded", "severe"] as DrainageCondition[]);
  const horizonOptions = options?.forecast_minutes ?? ([30, 60, 120, 180] as ForecastMinutes[]);

  return (
    <section className="border border-ops-line bg-ops-paper p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">Scenario</h2>
        <span className="text-xs font-semibold text-ops-muted">Reduced-order demonstration model</span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-ops-muted">
            <CloudRain className="h-4 w-4" />
            Rainfall
          </div>
          <div className="grid grid-cols-3 gap-2">
            {rainOptions.map((item) => (
              <button
                key={item}
                type="button"
                title={`Set rainfall to ${RAIN_LABELS[item]}`}
                onClick={() => {
                  clearError();
                  setScenario((current) => ({ ...current, rainfall_intensity: item }));
                }}
                className={buttonClass(scenario.rainfall_intensity === item)}
              >
                {RAIN_LABELS[item]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-ops-muted">
            <Workflow className="h-4 w-4" />
            Drainage
          </div>
          <div className="grid grid-cols-3 gap-2">
            {drainageOptions.map((item) => (
              <button
                key={item}
                type="button"
                title={`Set drainage to ${DRAINAGE_LABELS[item]}`}
                onClick={() => {
                  clearError();
                  setScenario((current) => ({ ...current, drainage_condition: item }));
                }}
                className={buttonClass(scenario.drainage_condition === item)}
              >
                {DRAINAGE_LABELS[item]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-ops-muted">
            <Clock className="h-4 w-4" />
            Horizon
          </div>
          <div className="grid grid-cols-4 gap-2">
            {horizonOptions.map((item) => (
              <button
                key={item}
                type="button"
                title={`Set horizon to T+${item}`}
                onClick={() => {
                  clearError();
                  setScenario((current) => ({ ...current, forecast_minutes: item }));
                }}
                className={buttonClass(scenario.forecast_minutes === item)}
              >
                T+{item}
              </button>
            ))}
          </div>
        </div>

        {error ? <div className="border border-ops-orange bg-white/70 p-2 text-xs text-ops-orange">{error}</div> : null}

        <button
          type="button"
          onClick={() => void runNowcast()}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 border border-ops-accentDark bg-ops-accentDark px-4 py-3 text-sm font-bold text-white transition hover:bg-ops-accent disabled:cursor-wait disabled:opacity-70"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          RUN NOWCAST
        </button>
      </div>
    </section>
  );
}
