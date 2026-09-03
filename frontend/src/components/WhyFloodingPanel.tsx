import { SearchCheck } from "lucide-react";
import { useFloodStore } from "../state/FloodStore";

function driverValue(value: unknown, key: string) {
  if (!value || typeof value !== "object") return "n/a";
  const record = value as Record<string, string | number>;
  if (key in record) return String(record[key]);
  return "n/a";
}

export default function WhyFloodingPanel() {
  const { clickedCell } = useFloodStore();
  const drivers = clickedCell?.drivers;
  const rows = [
    {
      label: "Rainfall level",
      value: driverValue(drivers?.rainfall, "level"),
      classification: driverValue(drivers?.rainfall, "classification"),
    },
    {
      label: "Runoff",
      value: `${driverValue(drivers?.runoff, "score_cm")} index`,
      classification: driverValue(drivers?.runoff, "classification"),
    },
    {
      label: "Drainage condition",
      value: driverValue(drivers?.drainage_stress, "condition"),
      classification: driverValue(drivers?.drainage_stress, "classification"),
    },
    {
      label: "Drainage stress",
      value: driverValue(drivers?.drainage_stress, "score"),
      classification: driverValue(drivers?.drainage_stress, "classification"),
    },
    {
      label: "Terrain accumulation",
      value: driverValue(drivers?.terrain_accumulation, "score"),
      classification: driverValue(drivers?.terrain_accumulation, "classification"),
    },
  ];

  return (
    <section className="border border-ops-line bg-ops-paper p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SearchCheck className="h-4 w-4 text-ops-accent" />
          <h2 className="text-sm font-bold">Why Is This Flooding?</h2>
        </div>
        <span className="text-xs font-semibold text-ops-muted">{clickedCell?.cell_id ?? "No focus cell"}</span>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 border-b border-ops-line/70 pb-2">
            <span className="text-xs text-ops-muted">{row.label}</span>
            <span className="text-right text-sm font-semibold text-ops-ink">
              {row.value}
              <span className="ml-2 text-[10px] font-bold text-ops-muted">{row.classification}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 border border-ops-line bg-white/60 p-3 text-sm">
        <span className="font-bold">Primary driver:</span> {drivers?.primary_cause ?? "No elevated driver"}
      </div>
    </section>
  );
}
