import { useEffect, useState } from "react";
import { fetchNowcast } from "../api/client";
import { useFloodStore } from "../state/FloodStore";
import type { DrainageCondition, NowcastResponse } from "../types/api";

const OPTIONS: DrainageCondition[] = ["normal", "degraded", "severe"];

const METRIC_COLOR: Record<string, string> = {
  normal: "#22c55e",
  degraded: "#eab308",
  severe: "#ef4444",
};

function MetricBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-2.5 py-2">
      <p className="font-mono text-[9px] uppercase tracking-wider text-ink-500 mb-0.5">{label}</p>
      <p className="font-mono text-xs font-bold tabular-nums text-ink-100">{value}</p>
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

  useEffect(() => { void compare(); }, []);

  const selectCls = "w-full rounded-xl border border-white/8 bg-ink-800 px-3 py-2 text-xs font-medium text-ink-200 outline-none focus:border-accent/60 transition";

  return (
    <div className="space-y-3">
      <p className="font-display text-xs font-semibold uppercase tracking-wider text-ink-300">Scenario Comparison</p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block mb-1 font-mono text-[9px] uppercase tracking-wider text-ink-500">Scenario A</label>
          <select value={leftDrainage} onChange={(e) => setLeftDrainage(e.target.value as DrainageCondition)} className={selectCls}>
            {OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1 font-mono text-[9px] uppercase tracking-wider text-ink-500">Scenario B</label>
          <select value={rightDrainage} onChange={(e) => setRightDrainage(e.target.value as DrainageCondition)} className={selectCls}>
            {OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void compare()}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink-700 px-4 py-2.5 text-xs font-bold text-ink-200 hover:bg-ink-600 hover:text-white transition disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? (
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M12 4v4M12 16v4M4 12H8M16 12h4" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M8 21H5a2 2 0 0 0-2-2v-3M21 16v3a2 2 0 0 0-2 2h-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {loading ? "Running…" : "Run Comparison"}
      </button>

      {message && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">{message}</div>
      )}

      {/* Results */}
      <div className="grid grid-cols-2 gap-2">
        {([
          { result: left, drainage: leftDrainage },
          { result: right, drainage: rightDrainage },
        ] as const).map(({ result, drainage }, i) => (
          <div key={i} className="rounded-2xl border border-white/8 bg-ink-800/60 p-3 space-y-1.5">
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[9px] uppercase tracking-wider text-ink-400">Scenario {i === 0 ? "A" : "B"}</p>
              <span className="font-mono text-[9px] font-bold" style={{ color: METRIC_COLOR[drainage] }}>
                {drainage}
              </span>
            </div>
            <MetricBlock label="Flooded area" value={`${result?.kpis.affected_area_km2 ?? "0.00"} km²`} />
            <MetricBlock label="Affected roads" value={result?.kpis.affected_road_count ?? 0} />
            <MetricBlock
              label="High-risk cells"
              value={result?.flood_cells.filter((c) => ["likely", "severe"].includes(c.risk_level)).length ?? 0}
            />
            <MetricBlock label="Confidence" value={result?.kpis.overall_confidence ?? "—"} />
          </div>
        ))}
      </div>
    </div>
  );
}
