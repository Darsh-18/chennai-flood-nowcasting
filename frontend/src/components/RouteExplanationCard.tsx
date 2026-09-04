import type { RouteResponse } from "../types/api";

export default function RouteExplanationCard({ route }: { route?: RouteResponse }) {
  if (!route) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3 text-xs text-ink-500 text-center">
        Route comparison will appear after calculation.
      </div>
    );
  }

  const detour = route.flood_aware_route.distance_km - route.normal_route.distance_km;
  const timeExtra = route.flood_aware_route.eta_min - route.normal_route.eta_min;

  return (
    <div className="rounded-2xl border border-white/8 bg-ink-800/60 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/5">
        <p className="text-xs font-semibold text-ink-200">{route.simulated_label}</p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-white/5">
        {/* Normal route */}
        <div className="p-3">
          <p className="font-mono text-[9px] uppercase tracking-wider text-ink-500 mb-1.5">Normal</p>
          <p className="font-mono text-sm font-bold text-ink-200 tabular-nums">{route.normal_route.distance_km.toFixed(2)} km</p>
          <p className="font-mono text-[10px] text-ink-400 tabular-nums">{route.normal_route.eta_min.toFixed(1)} min</p>
        </div>
        {/* Flood-aware route */}
        <div className="p-3">
          <p className="font-mono text-[9px] uppercase tracking-wider text-accent/80 mb-1.5">Flood-aware</p>
          <p className="font-mono text-sm font-bold text-accent tabular-nums">{route.flood_aware_route.distance_km.toFixed(2)} km</p>
          <p className="font-mono text-[10px] text-ink-400 tabular-nums">{route.flood_aware_route.eta_min.toFixed(1)} min</p>
        </div>
      </div>
      {/* Delta */}
      {(detour > 0.01 || timeExtra > 0.1) && (
        <div className="px-3 py-2 border-t border-white/5 flex gap-3">
          <span className="font-mono text-[9px] text-amber-400">
            +{detour.toFixed(2)} km detour
          </span>
          <span className="font-mono text-[9px] text-amber-400">
            +{timeExtra.toFixed(1)} min
          </span>
        </div>
      )}
      {/* Explanation */}
      {route.explanation && (
        <div className="px-3 py-2.5 border-t border-white/5">
          <p className="text-[11px] leading-relaxed text-ink-300">{route.explanation}</p>
        </div>
      )}
    </div>
  );
}
