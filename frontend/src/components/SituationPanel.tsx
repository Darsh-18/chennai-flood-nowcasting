import { Activity } from "lucide-react";
import { useFloodStore } from "../state/FloodStore";
import type { RiskLevel } from "../types/api";

const RISK_ITEMS: Array<{ key: RiskLevel; label: string; color: string }> = [
  { key: "safe", label: "0-10 cm", color: "#44875f" },
  { key: "watch", label: "10-30 cm", color: "#d9aa32" },
  { key: "likely", label: "30-60 cm", color: "#c46b2d" },
  { key: "severe", label: ">60 cm", color: "#b33a3a" },
];

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
    <section className="border border-ops-line bg-ops-paper p-4">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-ops-accent" />
        <h2 className="text-sm font-bold">Situation Summary</h2>
      </div>

      <div className="space-y-3 border border-ops-line bg-white/60 p-3">
        {riskData.map((item) => (
          <div key={item.key} className="grid grid-cols-[78px_1fr_36px] items-center gap-3">
            <div>
              <div className="text-xs font-bold uppercase text-ops-ink">{item.key}</div>
              <div className="text-[11px] text-ops-muted">{item.label}</div>
            </div>
            <div className="h-3 overflow-hidden border border-ops-line bg-ops-field">
              <div
                className="h-full"
                style={{
                  width: `${Math.max(4, (item.cells / maxCells) * 100)}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
            <div className="text-right text-sm font-bold">{item.cells}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {timelineData.map((item) => (
          <button
            key={item.label}
            type="button"
            className="grid w-full grid-cols-[58px_1fr_74px] items-center gap-3 border border-ops-line bg-white/60 px-3 py-2 text-left"
            title={`${item.label}: ${item.area.toFixed(2)} km2, ${item.roads} roads, ${item.confidence} confidence`}
          >
            <span className="text-sm font-bold">{item.label}</span>
            <span className="h-2 overflow-hidden border border-ops-line bg-ops-field">
              <span
                className="block h-full bg-ops-accent"
                style={{ width: `${Math.min(100, Math.max(3, item.area * 8))}%` }}
              />
            </span>
            <span className="text-right text-xs text-ops-muted">
              {item.area.toFixed(2)} km²
              <br />
              {item.roads} roads
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
