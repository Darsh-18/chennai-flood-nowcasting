import { useFloodStore } from "../state/FloodStore";

const RISK_COLOR: Record<string, string> = {
  severe: "#ef4444",
  likely: "#f97316",
  watch:  "#eab308",
  safe:   "#22c55e",
  high:   "#ef4444",
  moderate: "#eab308",
  low:    "#22c55e",
};

export default function KpiStrip() {
  const { activeStep, loading } = useFloodStore();
  const kpis = activeStep?.kpis;

  const riskColor = RISK_COLOR[kpis?.flood_risk?.toLowerCase() ?? "safe"] ?? "#8b98b8";

  if (loading && !kpis) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="veg-skeleton h-16 rounded-xl" />)}
      </div>
    );
  }

  const items = [
    {
      label: "Flood Risk",
      value: kpis?.flood_risk ?? "—",
      color: riskColor,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "Affected Area",
      value: `${kpis?.affected_area_km2?.toFixed(2) ?? "0.00"} km²`,
      color: "#38bdf8",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M3 15h18M9 3v18M15 3v18" strokeWidth="1.2" />
        </svg>
      ),
    },
    {
      label: "Affected Roads",
      value: `${kpis?.affected_road_count ?? 0}`,
      color: "#a78bfa",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M5 20 12 4l7 16M9 13h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "Confidence",
      value: kpis?.overall_confidence ?? "—",
      color: "#34d399",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 3l7 3v5c0 4.4-3 8.2-7 9.5C8 19.2 5 15.4 5 11V6l7-3z" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(({ label, value, color, icon }) => (
        <div
          key={label}
          className="rounded-xl border border-white/5 bg-white/[0.03] p-3"
          style={{ borderLeftColor: `${color}40`, borderLeftWidth: "3px" }}
        >
          <div className="flex items-center gap-1.5 mb-1.5" style={{ color }}>
            {icon}
            <span className="font-mono text-[9px] uppercase tracking-wider">{label}</span>
          </div>
          <div className="font-display text-base font-bold leading-5" style={{ color }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}
