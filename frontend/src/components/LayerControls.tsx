import { Layers, MapPinned, Route, Waves, Workflow } from "lucide-react";
import { useFloodStore, type LayerState } from "../state/FloodStore";

const LAYER_ITEMS: Array<{
  key: keyof LayerState;
  label: string;
  Icon: typeof Layers;
}> = [
  { key: "flood", label: "Flood Risk", Icon: Waves },
  { key: "drainage", label: "Drainage Network", Icon: Workflow },
  { key: "roads", label: "Roads", Icon: Layers },
  { key: "critical", label: "Critical Infrastructure", Icon: MapPinned },
  { key: "route", label: "Emergency Route", Icon: Route },
];

export default function LayerControls() {
  const { layers, toggleLayer } = useFloodStore();
  return (
    <section className="border border-ops-line bg-ops-paper p-4">
      <div className="mb-3 flex items-center gap-2">
        <Layers className="h-4 w-4 text-ops-accent" />
        <h2 className="text-sm font-bold">Map Layers</h2>
      </div>
      <div className="space-y-2">
        {LAYER_ITEMS.map(({ key, label, Icon }) => (
          <label
            key={key}
            className="flex cursor-pointer items-center justify-between border border-ops-line bg-white/60 px-3 py-2 text-sm"
          >
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-ops-muted" />
              {label}
            </span>
            <input
              type="checkbox"
              checked={layers[key]}
              onChange={() => toggleLayer(key)}
              className="h-4 w-4 accent-ops-accent"
              aria-label={`Toggle ${label}`}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
