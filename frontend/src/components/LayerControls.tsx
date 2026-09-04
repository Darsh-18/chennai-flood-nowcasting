import { useFloodStore } from "../state/FloodStore";
import LayerIcon from "./ui/LayerIcon";
import type { ChennaiLayerId } from "./ui/LayerIcon";
import type { LayerState } from "../state/FloodStore";

interface LayerDefinition {
  id: keyof LayerState;
  title: string;
  subtitle: string;
}

const LAYERS: LayerDefinition[] = [
  {
    id: "radar",
    title: "Rainfall",
    subtitle: "Live Radar",
  },
  {
    id: "flood",
    title: "Flood Risk",
    subtitle: "Nowcast Inundation",
  },
  {
    id: "drainage",
    title: "Drainage Network",
    subtitle: "Channels & Drains",
  },
  {
    id: "roads",
    title: "Roads",
    subtitle: "Impact & Severity",
  },
  {
    id: "critical",
    title: "Critical Infrastructure",
    subtitle: "Hospitals, Stations",
  },
  {
    id: "relief",
    title: "Relief Centers",
    subtitle: "Shelters",
  },
  {
    id: "route",
    title: "Emergency Route",
    subtitle: "Safe Path",
  },
];

export default function LayerControls() {
  const { layers, toggleLayer, layerCollapsed, setLayerCollapsed } = useFloodStore();

  if (layerCollapsed) {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-[#0d1527]/90 backdrop-blur-xl p-2 shadow-2xl">
        <button
          onClick={() => setLayerCollapsed(false)}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-ink-400 hover:bg-white/10 hover:text-cyan-400 transition-colors"
          aria-label="Expand layer panel"
          title="Expand Layers"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="h-px w-5 bg-white/10 my-1" />
        {LAYERS.map(({ id, title }) => {
          const active = !!layers[id];
          return (
            <button
              key={id}
              onClick={() => toggleLayer(id)}
              aria-label={`Toggle ${title}`}
              role="switch"
              aria-checked={active}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                active
                  ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40"
                  : "text-ink-500 hover:bg-white/8 hover:text-ink-300"
              }`}
              title={`${title}: ${active ? "ON" : "OFF"}`}
            >
              <LayerIcon id={id as ChennaiLayerId} active={active} />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-[260px] shrink-0 rounded-2xl border border-white/10 bg-[#0d1527]/90 backdrop-blur-xl shadow-2xl overflow-hidden transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <span className="font-display text-[11px] font-bold uppercase tracking-wider text-ink-300">
          LAYERS
        </span>
        <button
          onClick={() => setLayerCollapsed(true)}
          className="rounded-lg p-1 text-ink-400 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Collapse layer panel"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Layer rows */}
      <div className="p-2 space-y-1">
        {LAYERS.map(({ id, title, subtitle }) => {
          const active = !!layers[id];
          return (
            <button
              key={id}
              onClick={() => toggleLayer(id)}
              type="button"
              role="switch"
              aria-checked={active}
              className={`group grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2.5 w-full rounded-xl px-2.5 py-2 cursor-pointer transition-all ${
                active
                  ? "bg-white/[0.05] hover:bg-white/[0.08]"
                  : "hover:bg-white/[0.03] opacity-75 hover:opacity-100"
              }`}
            >
              {/* Column 1: Icon */}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  active
                    ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30"
                    : "bg-white/5 text-ink-500"
                }`}
              >
                <LayerIcon id={id as ChennaiLayerId} active={active} />
              </div>

              {/* Column 2: Title & Subtitle */}
              <div className="min-w-0 text-left">
                <div
                  className={`text-xs font-semibold leading-tight truncate transition-colors ${
                    active ? "text-white font-bold" : "text-ink-400"
                  }`}
                >
                  {title}
                </div>
                <div className="text-[10px] text-ink-500 leading-tight truncate">
                  {subtitle}
                </div>
              </div>

              {/* Column 3: Toggle Switch (Physical thumb animation, clear ON vs OFF) */}
              <div
                className={`relative inline-flex h-5 w-10 flex-shrink-0 items-center rounded-full border transition-all duration-200 ${
                  active
                    ? "bg-cyan-500 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                    : "bg-slate-800 border-slate-600/80"
                }`}
              >
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full transition-transform duration-200 shadow-md"
                  style={{
                    backgroundColor: active ? "#ffffff" : "#94a3b8",
                    transform: active ? "translateX(21px)" : "translateX(3px)",
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-white/8 bg-black/20">
        <div className="text-[9px] uppercase tracking-wider text-ink-400 font-mono mb-1">
          LEGEND
        </div>
        <div className="flex items-center justify-between text-[10px] text-ink-300">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-xs bg-emerald-500" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-xs bg-amber-400" />
            <span>Watch</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-xs bg-orange-500" />
            <span>Likely</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-xs bg-red-500" />
            <span>Severe</span>
          </div>
        </div>
      </div>
    </div>
  );
}
