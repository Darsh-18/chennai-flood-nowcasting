import { TimerReset } from "lucide-react";
import { useFloodStore } from "../state/FloodStore";

export default function ForecastTimeline() {
  const { forecast, selectedForecastMinute, setSelectedForecastMinute } = useFloodStore();
  const steps = forecast?.steps ?? [];

  return (
    <section className="border border-ops-line bg-ops-paper px-4 py-3">
      <div className="mb-3 flex items-center gap-2">
        <TimerReset className="h-4 w-4 text-ops-accent" />
        <h2 className="text-sm font-bold">Forecast Timeline</h2>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {steps.map((step) => {
          const active = selectedForecastMinute === step.forecast_minutes;
          return (
            <button
              key={step.label}
              type="button"
              onClick={() => setSelectedForecastMinute(step.forecast_minutes)}
              className={`border px-3 py-2 text-left transition ${
                active
                  ? "border-ops-accent bg-ops-accent text-white"
                  : "border-ops-line bg-white/70 text-ops-ink hover:border-ops-accent"
              }`}
            >
              <span className="block text-sm font-bold">{step.label}</span>
              <span className={`block text-xs ${active ? "text-white/85" : "text-ops-muted"}`}>
                {step.kpis.overall_confidence} confidence
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
