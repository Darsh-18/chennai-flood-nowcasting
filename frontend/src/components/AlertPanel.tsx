import { useFloodStore } from "../state/FloodStore";

const SEVERITY_COLOR: Record<string, string> = {
  severe: "#ef4444",
  likely: "#f97316",
  watch:  "#eab308",
  safe:   "#22c55e",
};

const SEVERITY_LABEL: Record<string, string> = {
  severe: "SEVERE",
  likely: "LIKELY",
  watch:  "WATCH",
  safe:   "ALL CLEAR",
};

export default function AlertPanel() {
  const { activeStep, loading } = useFloodStore();

  const alert = activeStep?.alert;
  const worstCell = activeStep?.flood_cells?.reduce((prev, curr) => {
    const rank = { severe: 3, likely: 2, watch: 1, safe: 0 };
    return (rank[curr.risk_level] ?? 0) > (rank[prev.risk_level] ?? 0) ? curr : prev;
  }, activeStep.flood_cells[0]);

  const severity = worstCell?.risk_level ?? "safe";
  const accentColor = SEVERITY_COLOR[severity] ?? SEVERITY_COLOR.safe;
  const isAllClear = severity === "safe";

  if (loading && !activeStep) {
    return (
      <div className="rounded-2xl border border-white/8 bg-ink-900/80 backdrop-blur-md px-4 py-3">
        <div className="veg-skeleton h-4 w-3/4 mb-2" />
        <div className="veg-skeleton h-3 w-full" />
      </div>
    );
  }

  if (isAllClear) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" aria-hidden>
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">All Clear</p>
          <p className="text-[11px] text-ink-300 mt-0.5">No active flood risk in the pilot zone.</p>
        </div>
      </div>
    );
  }

  if (!alert) return null;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: `${accentColor}30` }}
    >
      {/* Severity header band */}
      <div
        className="flex items-center gap-3 px-4 py-2.5"
        style={{ background: `${accentColor}18` }}
      >
        {/* Pulsing indicator */}
        <span className="relative flex h-3 w-3 flex-shrink-0">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ backgroundColor: accentColor }}
          />
          <span className="relative inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: accentColor }} />
        </span>
        <span
          className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ color: accentColor }}
        >
          {SEVERITY_LABEL[severity]} · Flood Alert
        </span>
      </div>

      {/* Alert body — scrolling marquee if long */}
      <div className="px-4 py-3 bg-ink-900/70 backdrop-blur-sm">
        {/* Headline — ticker style for long text */}
        <div className="overflow-hidden">
          <p
            className="font-display text-sm font-semibold text-white whitespace-nowrap"
            style={{ animation: alert.headline.length > 40 ? "ticker 18s linear infinite" : undefined }}
          >
            {alert.headline}&nbsp;&nbsp;&nbsp;&nbsp;{alert.headline.length > 40 ? alert.headline : ""}
          </p>
        </div>

        {/* Detail */}
        {alert.detail && (
          <p className="mt-1 text-[11px] leading-relaxed text-ink-300 line-clamp-2">{alert.detail}</p>
        )}

        {/* Recommended action */}
        {alert.recommended_action && (
          <div className="mt-2.5 flex items-start gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5" className="mt-0.5 flex-shrink-0" aria-hidden>
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinejoin="round" />
            </svg>
            <p className="text-[11px] font-medium text-ink-200">{alert.recommended_action}</p>
          </div>
        )}
      </div>
    </div>
  );
}
