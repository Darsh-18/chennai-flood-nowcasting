import { useFloodStore } from "../state/FloodStore";
import type { RiskLevel } from "../types/api";

const RISK_ITEMS: Array<{ key: RiskLevel; label: string; depth: string; color: string }> = [
  { key: "safe",   label: "Safe",   depth: "0–10 cm",  color: "#22c55e" },
  { key: "watch",  label: "Watch",  depth: "10–30 cm", color: "#eab308" },
  { key: "likely", label: "Likely", depth: "30–60 cm", color: "#f97316" },
  { key: "severe", label: "Severe", depth: "> 60 cm",  color: "#ef4444" },
];

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="text-right">
      <p className="font-mono text-[9px] uppercase tracking-wider text-ink-400">{label}</p>
      <p className="font-mono text-xs tabular-nums text-ink-100 font-semibold">{value}</p>
      {sub && <p className="font-mono text-[9px] text-ink-500">{sub}</p>}
    </div>
  );
}

export default function SituationPanel() {
  const { activeStep, forecast } = useFloodStore();

  const riskData = RISK_ITEMS.map((item) => ({
    ...item,
    cells: activeStep?.flood_cells.filter((cell) => cell.risk_level === item.key).length ?? 0,
  }));
  const maxCells = Math.max(...riskData.map((item) => item.cells), 1);

  const timelineData =
    forecast?.steps.map((step) => ({
      label: step.label,
      area: step.kpis.affected_area_km2,
      roads: step.kpis.affected_road_count,
      confidence: step.kpis.overall_confidence,
    })) ?? [];

  return (
    <div className="space-y-3">
      {/* Risk cell distribution */}
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-400">Risk Distribution</p>
        <div className="space-y-1.5">
          {riskData.map((item) => (
            <div key={item.key} className="flex items-center gap-3">
              <div className="w-12 text-right">
                <span className="font-mono text-[9px] font-bold uppercase" style={{ color: item.color }}>
                  {item.label}
                </span>
              </div>
              <div className="flex-1 h-2 overflow-hidden rounded-full bg-ink-700">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max(item.cells > 0 ? 4 : 0, (item.cells / maxCells) * 100)}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <span className="w-6 text-right font-mono text-[10px] tabular-nums text-ink-300">
                {item.cells}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* KPI row */}
      {activeStep && (
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
          <Stat label="Area" value={`${activeStep.kpis.affected_area_km2.toFixed(2)} km²`} />
          <Stat label="Roads" value={activeStep.kpis.affected_road_count} />
          <Stat label="Confidence" value={activeStep.kpis.overall_confidence} />
        </div>
      )}

      {/* Forecast step progression */}
      {timelineData.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-400">Forecast Progression</p>
          <div className="space-y-1">
            {timelineData.map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-lg px-1 py-0.5">
                <span className="w-10 font-mono text-[10px] font-semibold text-accent">{item.label}</span>
                <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-ink-700">
                  <div
                    className="h-full rounded-full bg-accent/60 transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(3, item.area * 8))}%` }}
                  />
                </div>
                <span className="w-16 text-right font-mono text-[9px] tabular-nums text-ink-400">
                  {item.area.toFixed(2)} km²
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
