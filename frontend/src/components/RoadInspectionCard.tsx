import { useFloodStore } from "../state/FloodStore";

export default function RoadInspectionCard() {
  const { clickedRoad, setClickedRoad } = useFloodStore();

  if (!clickedRoad) return null;

  const severity = clickedRoad.severity ?? (clickedRoad.risk_level?.toUpperCase() ?? "WATCH");
  const depth = clickedRoad.flood_depth ?? (clickedRoad.depth_band ?? "15 cm");
  const status = clickedRoad.status ?? (clickedRoad.passable ? "AFFECTED" : "IMPASSABLE");
  const name = clickedRoad.name ?? "Chennai Road Segment";

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    SAFE: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
    WATCH: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
    LIKELY: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
    SEVERE: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
  };

  const scheme = colorMap[severity] ?? colorMap.WATCH;

  return (
    <div className="absolute left-1/2 bottom-20 -translate-x-1/2 z-30 w-80 rounded-2xl border border-white/15 bg-[#0d1527]/95 backdrop-blur-xl p-4 shadow-2xl animate-fade-in">
      <div className="flex items-start justify-between gap-2 border-b border-white/8 pb-2.5 mb-2.5">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
            Road Corridor Inspection
          </span>
          <h4 className="text-sm font-bold text-white leading-snug">{name}</h4>
        </div>
        <button
          onClick={() => setClickedRoad(null)}
          className="rounded-lg p-1 text-ink-400 hover:bg-white/10 hover:text-white"
          aria-label="Close road inspection"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className={`rounded-xl border p-2 ${scheme.bg} ${scheme.border}`}>
          <div className="text-[9px] uppercase tracking-wider text-ink-400 font-mono">Severity</div>
          <div className={`text-sm font-extrabold ${scheme.text}`}>{severity}</div>
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
          <div className="text-[9px] uppercase tracking-wider text-ink-400 font-mono">Flood Depth</div>
          <div className="text-sm font-bold text-white">{depth}</div>
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
          <div className="text-[9px] uppercase tracking-wider text-ink-400 font-mono">Status</div>
          <div className="text-xs font-semibold text-ink-200">{status}</div>
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
          <div className="text-[9px] uppercase tracking-wider text-ink-400 font-mono">Forecast</div>
          <div className="text-xs font-semibold text-cyan-400">T+30 min</div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-white/8 pt-2 text-[10px] text-ink-400 font-mono">
        <span>Source: SIMULATED DEMO</span>
        <span className="text-amber-400/80">SIH26085</span>
      </div>
    </div>
  );
}
