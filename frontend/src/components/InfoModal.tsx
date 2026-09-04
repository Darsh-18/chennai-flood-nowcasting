import { useEffect, useRef } from "react";
import { useFloodStore } from "../state/FloodStore";

const CHENNAI_SOURCES = [
  {
    label: "OBSERVED",
    name: "Pilot Boundary",
    provides: "Study area boundary for the Cooum / Adyar river basin pilot zone.",
    color: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  },
  {
    label: "DERIVED",
    name: "Drainage Network",
    provides: "Storm drain topology derived from OpenStreetMap + DEM analysis.",
    color: "bg-sky-500/15 text-sky-400 border border-sky-500/20",
  },
  {
    label: "SIMULATED",
    name: "Flood Nowcast",
    provides: "Flood cell risk levels computed by the backend simulation engine (SIH26085).",
    color: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  },
  {
    label: "SIMULATED",
    name: "Forecast Steps",
    provides: "T+30 / T+60 / T+120 / T+180 minute probabilistic flood spread forecasts.",
    color: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  },
  {
    label: "OBSERVED",
    name: "Road Network",
    provides: "Road graph from OpenStreetMap — used for flood-aware routing.",
    color: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  },
  {
    label: "INFERRED",
    name: "Critical Infrastructure",
    provides: "Hospitals, shelters, fire stations — location data inferred from OSM and census.",
    color: "bg-purple-500/15 text-purple-400 border border-purple-500/20",
  },
];

export default function InfoModal() {
  const { infoOpen, setInfoOpen } = useFloodStore();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!infoOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInfoOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [infoOpen, setInfoOpen]);

  if (!infoOpen) return null;

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
    >
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
        aria-label="Close info dialog"
        onClick={() => setInfoOpen(false)}
      />

      {/* Panel */}
      <div className="relative max-h-[85vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-2xl border border-white/10 bg-ink-900/95 p-6 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="info-modal-title" className="font-display text-xl font-bold text-white">
              Data Sources
            </h2>
            <p className="mt-1 text-xs text-ink-400">
              Where every layer in this map comes from.
            </p>
          </div>
          <button
            ref={closeRef}
            onClick={() => setInfoOpen(false)}
            aria-label="Close"
            className="rounded-lg p-2 text-ink-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sources list */}
        <ul className="space-y-2">
          {CHENNAI_SOURCES.map((s) => (
            <li key={s.name} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
              <span className={`mt-0.5 shrink-0 rounded px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${s.color}`}>
                {s.label}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-200">{s.name}</p>
                <p className="text-xs leading-relaxed text-ink-400">{s.provides}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Disclaimer */}
        <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h3 className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Disclaimer
          </h3>
          <p className="text-xs leading-relaxed text-ink-200">
            This is a <strong>research and decision-support prototype</strong> developed as part
            of Smart India Hackathon 2026 (SIH26085). It does <em>not</em> replace official
            warnings from the India Meteorological Department (IMD), NDMA, or the Greater Chennai
            Corporation Disaster Management Cell. Layers marked <em>SIMULATED</em> use
            illustrative physics-based calculations — they are not operational flood forecasts.
            Always follow official advisories during emergencies.
          </p>
        </div>

        <p className="mt-4 text-center font-mono text-[10px] text-ink-400">
          AQUANEX · SIH26085 · NCMRWF collaboration · Demo build
        </p>
      </div>
    </div>
  );
}
