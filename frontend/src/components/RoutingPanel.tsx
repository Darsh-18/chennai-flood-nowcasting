import { useEffect, useMemo, useState } from "react";
import { fetchRoute } from "../api/client";
import { useFloodStore } from "../state/FloodStore";
import type { CriticalInfraProperties, ForecastMinutes, GeoJsonFeature } from "../types/api";
import RouteExplanationCard from "./RouteExplanationCard";

function InfraChip({ item }: { item?: GeoJsonFeature<CriticalInfraProperties> }) {
  if (!item) return <div className="h-12 rounded-xl bg-ink-700/50 flex items-center justify-center text-[10px] text-ink-500">No selection</div>;
  const TYPE_COLOR: Record<string, string> = {
    Hospital: "#f472b6",
    "Relief Center": "#34d399",
    "Fire Station": "#fb923c",
  };
  const color = TYPE_COLOR[item.properties.type] ?? "#8b98b8";
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
      <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-ink-200 truncate">{item.properties.name}</p>
        <p className="text-[9px] text-ink-500">{item.properties.type}</p>
      </div>
    </div>
  );
}

export default function RoutingPanel() {
  const { criticalInfrastructure, scenario, selectedForecastMinute, route, setRoute, layers, toggleLayer } = useFloodStore();
  const features = (criticalInfrastructure?.features ?? []) as unknown as Array<GeoJsonFeature<CriticalInfraProperties>>;
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (!features.length || start || end) return;
    setStart(features.find((f) => f.properties.type === "Hospital")?.properties.infra_id ?? features[0].properties.infra_id);
    setEnd(features.find((f) => f.properties.type === "Relief Center")?.properties.infra_id ?? features[features.length - 1].properties.infra_id);
  }, [end, features, start]);

  const startItem = useMemo(() => features.find((f) => f.properties.infra_id === start), [features, start]);
  const endItem   = useMemo(() => features.find((f) => f.properties.infra_id === end), [end, features]);

  async function calculate() {
    if (!start || !end) return;
    setLoading(true);
    setMessage(undefined);
    try {
      const forecast_minutes = [30, 60, 120, 180].includes(selectedForecastMinute)
        ? (selectedForecastMinute as ForecastMinutes)
        : scenario.forecast_minutes;
      const nextRoute = await fetchRoute({ start_infra_id: start, end_infra_id: end, scenario: { ...scenario, forecast_minutes } });
      setRoute(nextRoute);
      if (!layers.route) toggleLayer("route");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Route calculation failed");
    } finally {
      setLoading(false);
    }
  }

  const selectCls = "w-full rounded-xl border border-white/8 bg-ink-800 px-3 py-2 text-xs font-medium text-ink-200 outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition";

  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-400">Emergency Routing</p>

      {/* Selects */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block mb-1 font-mono text-[9px] uppercase tracking-wider text-ink-500">From</label>
          <select value={start} onChange={(e) => setStart(e.target.value)} className={selectCls}>
            {features.map((f) => (
              <option key={f.properties.infra_id} value={f.properties.infra_id}>{f.properties.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1 font-mono text-[9px] uppercase tracking-wider text-ink-500">To</label>
          <select value={end} onChange={(e) => setEnd(e.target.value)} className={selectCls}>
            {features.map((f) => (
              <option key={f.properties.infra_id} value={f.properties.infra_id}>{f.properties.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Selection chips */}
      <div className="grid grid-cols-2 gap-2">
        <InfraChip item={startItem} />
        <InfraChip item={endItem} />
      </div>

      {/* Error */}
      {message && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">{message}</div>
      )}

      {/* Calculate button */}
      <button
        type="button"
        onClick={() => void calculate()}
        disabled={loading || !start || !end || start === end}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2.5 font-display text-sm font-bold text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M12 4v4M12 16v4M4 12H8M16 12h4" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {loading ? "Calculating…" : "Calculate Safe Route"}
      </button>

      {/* Route result */}
      {route && <RouteExplanationCard route={route} />}
    </div>
  );
}
