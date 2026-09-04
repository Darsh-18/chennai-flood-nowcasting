import { useEffect, useState } from "react";
import { fetchDataStatus } from "../api/client";
import type { DataLayerStatus } from "../types/api";
import { ClassificationBadge } from "./ui/Badge";

const STATUS_COLOR: Record<string, string> = {
  ready:     "text-emerald-400",
  degraded:  "text-amber-400",
  error:     "text-red-400",
  loading:   "text-ink-400",
  simulated: "text-amber-400",
};

export default function DataStatusPanel() {
  const [layers, setLayers] = useState<DataLayerStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();

  async function refresh() {
    setLoading(true);
    setMessage(undefined);
    try {
      const response = await fetchDataStatus();
      setLayers(response.layers);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Data status refresh failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-display text-xs font-semibold uppercase tracking-wider text-ink-300">Data Sources</span>
        <button
          type="button"
          onClick={() => void refresh()}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-ink-400 hover:bg-white/8 hover:text-ink-200 transition-colors"
        >
          <svg
            className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden
          >
            <path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Error */}
      {message && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">{message}</div>
      )}

      {/* Skeleton */}
      {loading && !layers.length && (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="veg-skeleton h-12 rounded-xl" />)}
        </div>
      )}

      {/* Layer rows */}
      <div className="space-y-1.5">
        {layers.map((layer) => (
          <div key={layer.name} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-ink-200">{layer.name}</span>
              <ClassificationBadge label={layer.classification} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-ink-400 leading-relaxed flex-1">{layer.detail}</span>
              <span className={`font-mono text-[9px] font-semibold uppercase ${STATUS_COLOR[layer.status?.toLowerCase()] ?? "text-ink-400"}`}>
                {layer.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* SIMULATED footer */}
      <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 px-3 py-2">
        <p className="font-mono text-[9px] text-amber-400/80 leading-relaxed">
          ⚠ Layers marked SIMULATED use demonstration data. Not for operational use.
        </p>
      </div>
    </div>
  );
}
