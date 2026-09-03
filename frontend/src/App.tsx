import { useState } from "react";
import { DatabaseZap, GitCompare, LayoutDashboard, Route, ShieldAlert } from "lucide-react";
import AlertPanel from "./components/AlertPanel";
import DataStatusPanel from "./components/DataStatusPanel";
import DemoModeBadge from "./components/DemoModeBadge";
import ForecastTimeline from "./components/ForecastTimeline";
import KpiStrip from "./components/KpiStrip";
import LayerControls from "./components/LayerControls";
import MapView from "./components/MapView";
import RoutingPanel from "./components/RoutingPanel";
import ScenarioComparisonPanel from "./components/ScenarioComparisonPanel";
import ScenarioControls from "./components/ScenarioControls";
import SituationPanel from "./components/SituationPanel";
import WhyFloodingPanel from "./components/WhyFloodingPanel";
import { useFloodStore } from "./state/FloodStore";

type ViewKey = "dashboard" | "routing" | "comparison" | "data";

const NAV_ITEMS = [
  { key: "dashboard" as const, label: "Dashboard", Icon: LayoutDashboard },
  { key: "routing" as const, label: "Routing", Icon: Route },
  { key: "comparison" as const, label: "Comparison", Icon: GitCompare },
  { key: "data" as const, label: "Data Status", Icon: DatabaseZap },
];

function RightPanel({ view }: { view: ViewKey }) {
  if (view === "routing") {
    return (
      <>
        <KpiStrip />
        <RoutingPanel />
        <AlertPanel />
      </>
    );
  }
  if (view === "comparison") {
    return (
      <>
        <ScenarioComparisonPanel />
        <SituationPanel />
      </>
    );
  }
  if (view === "data") {
    return <DataStatusPanel />;
  }
  return (
    <>
      <KpiStrip />
      <WhyFloodingPanel />
      <AlertPanel />
      <SituationPanel />
    </>
  );
}

export default function App() {
  const { scenario, activeStep, health } = useFloodStore();
  const [view, setView] = useState<ViewKey>("dashboard");

  return (
    <main className="flex h-full min-h-screen flex-col bg-ops-panel text-ops-ink">
      <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-ops-line bg-ops-paper px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-ops-accentDark" />
            <h1 className="truncate text-lg font-black">Chennai Urban Flood Nowcasting & Decision Support Prototype</h1>
          </div>
          <div className="mt-1 text-xs font-semibold text-ops-muted">
            SIH26085 · Pilot Zone (illustrative boundary) · {activeStep?.kpis.forecast_label ?? "T+60"}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <DemoModeBadge />
          <div className="border border-ops-line bg-white/70 px-3 py-2 text-xs font-semibold">
            {scenario.rainfall_intensity} rainfall · {scenario.drainage_condition} drainage · T+
            {scenario.forecast_minutes}
          </div>
          {health?.message ? (
            <div className="border border-ops-orange bg-white/70 px-3 py-2 text-xs font-semibold text-ops-orange">
              {health.message}
            </div>
          ) : null}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 xl:grid-cols-[280px_minmax(560px,1fr)_320px]">
        <aside className="min-h-0 overflow-y-auto">
          <nav className="mb-4 grid grid-cols-2 gap-2 border border-ops-line bg-ops-paper p-3">
            {NAV_ITEMS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={`flex items-center justify-center gap-2 border px-3 py-2 text-sm font-bold transition ${
                  view === key
                    ? "border-ops-accent bg-ops-accent text-white"
                    : "border-ops-line bg-white/70 hover:border-ops-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
          <div className="space-y-4">
            <ScenarioControls />
            <LayerControls />
          </div>
        </aside>

        <section className="flex min-h-[620px] flex-col gap-4 xl:min-h-0">
          <ForecastTimeline />
          <div className="min-h-0 flex-1">
            <MapView />
          </div>
        </section>

        <aside className="min-h-0 space-y-4 overflow-y-auto">
          <RightPanel view={view} />
        </aside>
      </div>
    </main>
  );
}
