import { useEffect, useState } from "react";
import { GitCompare, RefreshCw } from "lucide-react";
import { fetchNowcast } from "../api/client";
import { useFloodStore } from "../state/FloodStore";
import type { DrainageCondition, NowcastResponse } from "../types/api";

const OPTIONS: DrainageCondition[] = ["normal", "degraded", "severe"];

function MetricBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-ops-line bg-white/60 p-3">
      <div className="text-xs font-bold uppercase text-ops-muted">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

export default function ScenarioComparisonPanel() {
  const { scenario } = useFloodStore();
  const [leftDrainage, setLeftDrainage] = useState<DrainageCondition>("normal");
  const [rightDrainage, setRightDrainage] = useState<DrainageCondition>("severe");
  const [left, setLeft] = useState<NowcastResponse>();
  const [right, setRight] = useState<NowcastResponse>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();

  async function compare() {
    setLoading(true);
    setMessage(undefined);
    try {
      const [leftResult, rightResult] = await Promise.all([
        fetchNowcast({ ...scenario, drainage_condition: leftDrainage }),
        fetchNowcast({ ...scenario, drainage_condition: rightDrainage }),
      ]);
      setLeft(leftResult);
      setRight(rightResult);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Scenario comparison failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void compare();
  }, []);

  return (
    <section className="border border-ops-line bg-ops-paper p-4">
      <div className="mb-3 flex items-center gap-2">
        <GitCompare className="h-4 w-4 text-ops-accent" />
        <h2 className="text-sm font-bold">Scenario Comparison</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-bold uppercase text-ops-muted">
          Scenario A
          <select
            value={leftDrainage}
            onChange={(event) => setLeftDrainage(event.target.value as DrainageCondition)}
            className="mt-2 w-full border border-ops-line bg-white px-3 py-2 text-sm font-semibold text-ops-ink"
          >
            {OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase text-ops-muted">
          Scenario B
          <select
            value={rightDrainage}
            onChange={(event) => setRightDrainage(event.target.value as DrainageCondition)}
            className="mt-2 w-full border border-ops-line bg-white px-3 py-2 text-sm font-semibold text-ops-ink"
          >
            {OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={() => void compare()}
        disabled={loading}
        className="mt-3 flex w-full items-center justify-center gap-2 border border-ops-accentDark bg-ops-accentDark px-4 py-3 text-sm font-bold text-white hover:bg-ops-accent disabled:cursor-wait disabled:opacity-70"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        RUN COMPARISON
      </button>
      {message ? <div className="mt-3 border border-ops-orange bg-white/70 p-2 text-xs text-ops-orange">{message}</div> : null}
      <div className="mt-3 grid grid-cols-2 gap-3">
        {[left, right].map((result, index) => (
          <div key={index} className="space-y-2 border border-ops-line bg-ops-panel p-3">
            <div className="text-sm font-bold">
              {index === 0 ? leftDrainage : rightDrainage} drainage · T+{scenario.forecast_minutes}
            </div>
            <MetricBlock label="Flooded area" value={`${result?.kpis.affected_area_km2 ?? "0.00"} km²`} />
            <MetricBlock label="Affected roads" value={result?.kpis.affected_road_count ?? 0} />
            <MetricBlock
              label="High-risk cells"
              value={result?.flood_cells.filter((cell) => ["likely", "severe"].includes(cell.risk_level)).length ?? 0}
            />
            <MetricBlock label="Confidence" value={result?.kpis.overall_confidence ?? "Moderate"} />
          </div>
        ))}
      </div>
    </section>
  );
}
