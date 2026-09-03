import { Gauge, Map, Route, Shield } from "lucide-react";
import { useFloodStore } from "../state/FloodStore";

export default function KpiStrip() {
  const { activeStep } = useFloodStore();
  const kpis = activeStep?.kpis;
  const items = [
    { label: "Flood risk", value: kpis?.flood_risk ?? "Loading", Icon: Gauge },
    { label: "Affected area", value: `${kpis?.affected_area_km2 ?? "0.00"} km²`, Icon: Map },
    { label: "Affected roads", value: `${kpis?.affected_road_count ?? 0}`, Icon: Route },
    { label: "Confidence", value: kpis?.overall_confidence ?? "High", Icon: Shield },
  ];

  return (
    <section className="grid grid-cols-2 gap-2">
      {items.map(({ label, value, Icon }) => (
        <div key={label} className="border border-ops-line bg-ops-paper p-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-ops-muted">
            <Icon className="h-4 w-4" />
            {label}
          </div>
          <div className="mt-2 min-h-[38px] text-base font-bold leading-5 text-ops-ink">{value}</div>
        </div>
      ))}
    </section>
  );
}
