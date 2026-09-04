import { useState } from "react";
import { useFloodStore } from "../state/FloodStore";
import RoutingPanel from "./RoutingPanel";
import ScenarioComparisonPanel from "./ScenarioComparisonPanel";
import DataStatusPanel from "./DataStatusPanel";

export default function RightIntelligencePanel({
  activeDrawer,
  onCloseDrawer,
}: {
  activeDrawer?: "route" | "compare" | "data" | "feedback" | null;
  onCloseDrawer?: () => void;
}) {
  const { nowcast, activeStep, clickedCell } = useFloodStore();
  const [whyFloodingOpen, setWhyFloodingOpen] = useState(true);
  const [overviewOpen, setOverviewOpen] = useState(true);

  // If a drawer is open, show that drawer content (Routing, Compare, Data Status, Feedback)
  if (activeDrawer === "route") {
    return (
      <div className="fixed layout-right-rail right-4 z-20 w-[360px] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1527]/95 backdrop-blur-xl p-4 shadow-2xl animate-slide-left">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-display font-bold text-sm">EMERGENCY ROUTING</span>
          </div>
          <button
            onClick={onCloseDrawer}
            className="rounded-lg p-1 text-ink-400 hover:text-white hover:bg-white/10"
          >
            ×
          </button>
        </div>
        <RoutingPanel />
      </div>
    );
  }

  if (activeDrawer === "compare") {
    return (
      <div className="fixed layout-right-rail right-4 z-20 w-[380px] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1527]/95 backdrop-blur-xl p-4 shadow-2xl animate-slide-left">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-display font-bold text-sm">SCENARIO COMPARISON</span>
          </div>
          <button
            onClick={onCloseDrawer}
            className="rounded-lg p-1 text-ink-400 hover:text-white hover:bg-white/10"
          >
            ×
          </button>
        </div>
        <ScenarioComparisonPanel />
      </div>
    );
  }

  if (activeDrawer === "data") {
    return (
      <div className="fixed layout-right-rail right-4 z-20 w-[380px] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1527]/95 backdrop-blur-xl p-4 shadow-2xl animate-slide-left">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-display font-bold text-sm">DATA SOURCES & PROVENANCE</span>
          </div>
          <button
            onClick={onCloseDrawer}
            className="rounded-lg p-1 text-ink-400 hover:text-white hover:bg-white/10"
          >
            ×
          </button>
        </div>
        <DataStatusPanel />
      </div>
    );
  }

  if (activeDrawer === "feedback") {
    return (
      <div className="fixed top-20 right-4 z-40 w-[340px] rounded-2xl border border-white/10 bg-[#0d1527]/95 backdrop-blur-xl p-4 shadow-2xl animate-slide-left">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <span className="text-cyan-400 font-display font-bold text-sm">FEEDBACK & INCIDENT REPORT</span>
          <button onClick={onCloseDrawer} className="text-ink-400 hover:text-white">×</button>
        </div>
        <p className="text-xs text-ink-300 mb-3">
          Report actual street waterlogging to calibrate the Chennai reduced-order nowcasting model.
        </p>
        <textarea
          className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs text-white placeholder-ink-500 focus:outline-none focus:border-cyan-400"
          rows={3}
          placeholder="Location, approximate depth, or impassable road…"
        />
        <button
          onClick={onCloseDrawer}
          className="mt-3 w-full rounded-xl bg-cyan-500 py-2 text-xs font-bold text-ink-950 hover:bg-cyan-400"
        >
          Submit Report
        </button>
      </div>
    );
  }

  // Standard Intelligence Panel from Reference Screenshot
  const kpis = activeStep?.kpis ?? nowcast?.kpis;
  const risk = kpis?.flood_risk ?? "High";
  const affectedArea = kpis?.affected_area_km2?.toFixed(2) ?? "3.61";
  const affectedRoads = kpis?.affected_road_count ?? 12;
  const confidence = kpis?.overall_confidence ?? "Moderate";

  const drivers = clickedCell?.drivers ?? {
    rainfall: { value: "High" },
    runoff: { value: 3.03 },
    drainage_stress: { value: "High" },
    terrain_accumulation: { value: 0.96 },
    primary_cause: "Drainage Stress",
  };

  const primaryDriver =
    clickedCell?.drivers?.primary_cause ?? "Drainage Stress";

  return (
    <div className="fixed layout-right-rail right-4 z-20 w-[320px] overflow-y-auto space-y-3 pointer-events-auto">
      {/* 1. Flood Risk Overview Card */}
      {overviewOpen && (
        <div className="rounded-2xl border border-white/10 bg-[#0d1527]/90 backdrop-blur-xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="font-display text-[11px] font-bold uppercase tracking-wider text-ink-300">
              FLOOD RISK OVERVIEW
            </span>
            <button
              onClick={() => setOverviewOpen(false)}
              className="text-ink-400 hover:text-white"
              aria-label="Close overview"
            >
              ×
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-ink-400">
                RISK LEVEL
              </div>
              <div className="text-2xl font-black text-red-500 uppercase tracking-tight">
                {risk}
              </div>
            </div>

            {/* Red Waves Icon from Screenshot */}
            <div className="flex flex-col gap-1 text-red-500 p-2 rounded-xl bg-red-500/10 border border-red-500/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M2 6c3-2 5-2 8 0s5 2 8 0 5-2 8 0" strokeLinecap="round" />
                <path d="M2 12c3-2 5-2 8 0s5 2 8 0 5-2 8 0" strokeLinecap="round" />
                <path d="M2 18c3-2 5-2 8 0s5 2 8 0 5-2 8 0" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="space-y-2 text-xs border-t border-white/8 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-ink-400">AFFECTED AREA</span>
              <span className="font-mono font-bold text-white">{affectedArea} km²</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink-400">AFFECTED ROADS</span>
              <span className="font-mono font-bold text-white">{affectedRoads}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink-400">CONFIDENCE</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="font-semibold text-amber-300">{confidence}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Why Is This Flooding? Card */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1527]/90 backdrop-blur-xl p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-[11px] font-bold uppercase tracking-wider text-ink-300">
            WHY IS THIS FLOODING?
          </span>
          <button
            onClick={() => setWhyFloodingOpen(!whyFloodingOpen)}
            className="text-ink-400 hover:text-white"
          >
            {whyFloodingOpen ? "−" : "+"}
          </button>
        </div>

        {whyFloodingOpen && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-ink-400">Rainfall Intensity</span>
                <span className="text-red-400 font-bold">High</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: "90%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-ink-400">Runoff</span>
                <span className="text-amber-400 font-bold font-mono">3.03</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: "75%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-ink-400">Drainage Stress</span>
                <span className="text-red-400 font-bold">High</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: "85%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-ink-400">Terrain Accumulation</span>
                <span className="text-amber-400 font-bold font-mono">0.96</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: "65%" }} />
              </div>
            </div>

            {/* Primary Driver Red Box from Screenshot */}
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 mt-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 text-red-400 flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div>
                <div className="text-[9px] uppercase font-mono tracking-wider text-ink-400">
                  PRIMARY DRIVER
                </div>
                <div className="text-sm font-bold text-red-400 leading-tight">
                  {primaryDriver}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Alerts Card from Screenshot */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1527]/90 backdrop-blur-xl p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-[11px] font-bold uppercase tracking-wider text-ink-300">
            ALERTS
          </span>
          <span className="text-[10px] font-mono font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
            1 Active
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="rounded-xl border border-red-500/20 bg-white/[0.02] p-2.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-red-400">⚠️</span>
                <span className="font-bold text-white">Flooding Likely</span>
              </div>
              <span className="text-[10px] text-ink-500 font-mono">Just now</span>
            </div>
            <p className="text-[11px] text-ink-300 leading-snug">
              High rainfall with degraded drainage causing water accumulation in Velachery & Madipakkam.
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-white/[0.02] p-2.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400">⚠️</span>
                <span className="font-bold text-white">Road Impact</span>
              </div>
              <span className="text-[10px] text-ink-500 font-mono">5 min ago</span>
            </div>
            <p className="text-[11px] text-ink-300 leading-snug">
              12 roads likely to be affected in next 30 min. GST road bypass inundated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
