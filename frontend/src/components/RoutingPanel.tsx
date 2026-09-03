import { useEffect, useMemo, useState } from "react";
import { Navigation2, RefreshCw } from "lucide-react";
import { fetchRoute } from "../api/client";
import { useFloodStore } from "../state/FloodStore";
import type { CriticalInfraProperties, ForecastMinutes, GeoJsonFeature } from "../types/api";
import RouteExplanationCard from "./RouteExplanationCard";
import CriticalInfraPopup from "./CriticalInfraPopup";

export default function RoutingPanel() {
  const { criticalInfrastructure, scenario, selectedForecastMinute, route, setRoute, layers, toggleLayer } = useFloodStore();
  const features = (criticalInfrastructure?.features ?? []) as unknown as Array<GeoJsonFeature<CriticalInfraProperties>>;
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (!features.length || start || end) return;
    setStart(features.find((feature) => feature.properties.type === "Hospital")?.properties.infra_id ?? features[0].properties.infra_id);
    setEnd(
      features.find((feature) => feature.properties.type === "Relief Center")?.properties.infra_id ??
        features[features.length - 1].properties.infra_id,
    );
  }, [end, features, start]);

  const startItem = useMemo(() => features.find((feature) => feature.properties.infra_id === start), [features, start]);
  const endItem = useMemo(() => features.find((feature) => feature.properties.infra_id === end), [end, features]);

  async function calculate() {
    if (!start || !end) return;
    setLoading(true);
    setMessage(undefined);
    try {
      const forecast_minutes = [30, 60, 120, 180].includes(selectedForecastMinute)
        ? (selectedForecastMinute as ForecastMinutes)
        : scenario.forecast_minutes;
      const nextRoute = await fetchRoute({
        start_infra_id: start,
        end_infra_id: end,
        scenario: { ...scenario, forecast_minutes },
      });
      setRoute(nextRoute);
      if (!layers.route) toggleLayer("route");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Route calculation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border border-ops-line bg-ops-paper p-4">
      <div className="mb-3 flex items-center gap-2">
        <Navigation2 className="h-4 w-4 text-ops-accent" />
        <h2 className="text-sm font-bold">Emergency Routing</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-bold uppercase text-ops-muted">
          Start
          <select
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className="mt-2 w-full border border-ops-line bg-white px-3 py-2 text-sm font-semibold text-ops-ink"
          >
            {features.map((feature) => (
              <option key={feature.properties.infra_id} value={feature.properties.infra_id}>
                {feature.properties.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase text-ops-muted">
          Destination
          <select
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            className="mt-2 w-full border border-ops-line bg-white px-3 py-2 text-sm font-semibold text-ops-ink"
          >
            {features.map((feature) => (
              <option key={feature.properties.infra_id} value={feature.properties.infra_id}>
                {feature.properties.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <CriticalInfraPopup item={startItem} />
        <CriticalInfraPopup item={endItem} />
      </div>
      {message ? <div className="mt-3 border border-ops-orange bg-white/70 p-2 text-xs text-ops-orange">{message}</div> : null}
      <button
        type="button"
        onClick={() => void calculate()}
        disabled={loading || !start || !end || start === end}
        className="mt-3 flex w-full items-center justify-center gap-2 border border-ops-accentDark bg-ops-accentDark px-4 py-3 text-sm font-bold text-white hover:bg-ops-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        CALCULATE SAFE ROUTE
      </button>
      <div className="mt-3">
        <RouteExplanationCard route={route} />
      </div>
    </section>
  );
}
