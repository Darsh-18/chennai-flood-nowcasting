import { useFloodStore } from "../state/FloodStore";

const RISK_COLORS: Record<string, string> = {
  severe: "#ef4444",
  likely: "#f97316",
  watch:  "#eab308",
  safe:   "#22c55e",
};

const RISK_RANK: Record<string, number> = { severe: 3, likely: 2, watch: 1, safe: 0 };

function RiskRing({ score, color }: { score: number; color: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" role="img" aria-label={`Risk score ${score} of 100`}>
      <circle cx="34" cy="34" r={r} fill="none" stroke="#1c2536" strokeWidth="6" />
      <circle
        cx="34" cy="34" r={r} fill="none"
        stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`}
        transform="rotate(-90 34 34)"
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)" }}
      />
      <text x="34" y="39" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="JetBrains Mono, monospace" style={{ fontVariantNumeric: "tabular-nums" }}>
        {score}
      </text>
    </svg>
  );
}

function driverValue(value: unknown, key: string): string {
  if (!value || typeof value !== "object") return "—";
  const record = value as Record<string, string | number>;
  if (key in record) return String(record[key]);
  return "—";
}

const DRIVER_BARS: { label: string; getScore: (drivers: Record<string, unknown>) => number; color: string }[] = [
  {
    label: "Rainfall",
    getScore: (d) => {
      const lvl = driverValue(d.rainfall, "level");
      const map: Record<string, number> = { low: 0.2, moderate: 0.45, heavy: 0.7, extreme: 1 };
      return map[lvl] ?? 0;
    },
    color: "#38bdf8",
  },
  {
    label: "Runoff",
    getScore: (d) => {
      const v = parseFloat(driverValue(d.runoff, "score_cm"));
      return isNaN(v) ? 0 : Math.min(v / 30, 1);
    },
    color: "#818cf8",
  },
  {
    label: "Drainage stress",
    getScore: (d) => {
      const v = parseFloat(driverValue(d.drainage_stress, "score"));
      return isNaN(v) ? 0 : Math.min(v / 10, 1);
    },
    color: "#f59e0b",
  },
  {
    label: "Terrain",
    getScore: (d) => {
      const v = parseFloat(driverValue(d.terrain_accumulation, "score"));
      return isNaN(v) ? 0 : Math.min(v / 10, 1);
    },
    color: "#f472b6",
  },
];

export default function WhyFloodingPanel() {
  const { clickedCell, loading } = useFloodStore();

  if (loading && !clickedCell) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <div className="veg-skeleton h-[68px] w-[68px] rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="veg-skeleton h-5 w-20" />
            <div className="veg-skeleton h-3 w-32" />
          </div>
        </div>
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <div className="veg-skeleton h-2.5 w-24" />
              <div className="veg-skeleton h-1.5 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!clickedCell) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b98b8" strokeWidth="1.5" aria-hidden>
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
        <p className="text-xs text-ink-400">Click a flood cell on the map<br />to see the risk breakdown.</p>
      </div>
    );
  }

  const drivers = clickedCell.drivers as Record<string, unknown> ?? {};
  const risk = clickedCell.risk_level;
  const color = RISK_COLORS[risk] ?? RISK_COLORS.safe;
  const score = Math.round((RISK_RANK[risk] ?? 0) / 3 * 100);

  return (
    <div className="space-y-3">
      {/* Risk ring + label */}
      <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-3">
        <RiskRing score={score} color={color} />
        <div>
          <p className="text-2xl font-bold capitalize" style={{ color }}>{risk}</p>
          <p className="text-xs text-ink-400">Flood risk level</p>
          <p className="mt-1 font-mono text-[10px] text-ink-500">Cell {clickedCell.cell_id}</p>
        </div>
      </div>

      {/* Driver bars */}
      <div className="space-y-2">
        {DRIVER_BARS.map(({ label, getScore, color: c }) => {
          const v = getScore(drivers);
          return (
            <div key={label}>
              <div className="mb-0.5 flex justify-between text-[10px] text-ink-400">
                <span>{label}</span>
                <span className="font-mono tabular-nums">{Math.round(v * 100)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-700" role="img" aria-label={`${label}: ${Math.round(v * 100)} of 100`}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v * 100}%`, backgroundColor: c }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary cause */}
      {Boolean(drivers.primary_cause) && (
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-ink-400 mb-1">Primary driver</p>
          <p className="text-xs text-ink-200">{String(drivers.primary_cause)}</p>
        </div>
      )}
    </div>
  );
}
