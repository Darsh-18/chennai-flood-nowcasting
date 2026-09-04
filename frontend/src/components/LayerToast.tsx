import { useEffect, useState } from "react";
import { useFloodStore } from "../state/FloodStore";
import LayerIcon from "./ui/LayerIcon";
import type { ChennaiLayerId } from "./ui/LayerIcon";
import type { LayerState } from "../state/FloodStore";

const LAYER_META: { id: keyof LayerState; label: string; description: string; legend: { color: string; label: string }[] }[] = [
  {
    id: "flood",
    label: "Flood Risk",
    description: "Cell colour = simulated flood risk (safe → watch → likely → severe).",
    legend: [
      { color: "#22c55e", label: "Safe" },
      { color: "#eab308", label: "Watch" },
      { color: "#f97316", label: "Likely" },
      { color: "#ef4444", label: "Severe" },
    ],
  },
  {
    id: "drainage",
    label: "Drainage Network",
    description: "Storm drain topology — stress level shown by line brightness.",
    legend: [{ color: "#38bdf8", label: "Drain lines" }],
  },
  {
    id: "roads",
    label: "Road Network",
    description: "OSM road graph used for flood-aware routing calculations.",
    legend: [{ color: "#aab6d4", label: "Road links" }],
  },
  {
    id: "critical",
    label: "Critical Infrastructure",
    description: "Hospitals, shelters, and fire stations in the pilot zone.",
    legend: [
      { color: "#f472b6", label: "Hospital" },
      { color: "#34d399", label: "Shelter" },
      { color: "#fb923c", label: "Fire station" },
    ],
  },
  {
    id: "route",
    label: "Route",
    description: "Flood-aware route vs normal route — calculated on demand.",
    legend: [
      { color: "#38bdf8", label: "Flood-aware" },
      { color: "#8b98b8", label: "Normal" },
    ],
  },
];

export default function LayerToast() {
  const { lastLayerEvent } = useFloodStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastLayerEvent) return;
    setVisible(true);
    const id = setTimeout(() => setVisible(false), 4200);
    return () => clearTimeout(id);
  }, [lastLayerEvent]);

  const meta = lastLayerEvent ? LAYER_META.find((m) => m.id === lastLayerEvent.layer) : undefined;
  if (!meta) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 bottom-32 z-40 flex justify-center px-4 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="w-[min(92vw,26rem)] rounded-2xl border border-white/10 bg-ink-900/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
        <p className="flex items-center gap-2 text-xs font-semibold text-white">
          <LayerIcon id={meta.id as ChennaiLayerId} active={!!lastLayerEvent?.on} />
          <span>
            {lastLayerEvent?.on ? "Layer added — " : "Layer removed — "}
            <span className={lastLayerEvent?.on ? "text-accent" : "text-ink-400"}>{meta.label}</span>
          </span>
        </p>
        {lastLayerEvent?.on && (
          <>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{meta.description}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {meta.legend.map((item) => (
                <span key={item.label} className="flex items-center gap-1.5 text-[10px] text-ink-200">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
