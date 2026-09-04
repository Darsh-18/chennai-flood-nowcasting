import { useState } from "react";
import MapView from "./components/MapView";
import TopBar from "./components/TopBar";
import LayerControls from "./components/LayerControls";
import ScenarioControls from "./components/ScenarioControls";
import RightIntelligencePanel from "./components/RightIntelligencePanel";
import ForecastTimeline from "./components/ForecastTimeline";
import LayerToast from "./components/LayerToast";
import InfoModal from "./components/InfoModal";
import { useFloodStore } from "./state/FloodStore";

export default function App() {
  const { layerPanelOpen, startupPhase } = useFloodStore();
  const [activeDrawer, setActiveDrawer] = useState<"route" | "compare" | "data" | "feedback" | null>(null);

  const isReady = startupPhase === "ready" || startupPhase === "chennai";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0e1a] text-ink-200 font-body select-none">
      {/* ════════════ CENTRAL REAL-WORLD GIS MAP ════════════ */}
      <div className="absolute inset-0 z-0">
        <MapView />
      </div>

      {/* ════════════ STAGGERED HUD REVEAL ════════════ */}
      {isReady && (
        <>
          {/* Top Bar */}
          <TopBar />

          {/* Left HUD: Layers & Scenario Controls */}
          {layerPanelOpen && (
            <div className="fixed layout-left-rail left-4 z-20 w-[268px] custom-sidebar-scroll flex flex-col gap-3 pr-1.5 pb-6 pointer-events-auto transition-all duration-300">
              <LayerControls />
              <ScenarioControls />
            </div>
          )}

          {/* Right Intelligence HUD */}
          <RightIntelligencePanel
            activeDrawer={activeDrawer}
            onCloseDrawer={() => setActiveDrawer(null)}
          />

          {/* Bottom Forecast Timeline & Action Pills */}
          <ForecastTimeline
            onOpenDrawer={(tab) => {
              setActiveDrawer((prev) => (prev === tab ? null : tab));
            }}
            activeDrawer={activeDrawer}
          />
        </>
      )}

      {/* ════════════ TOASTS & MODALS ════════════ */}
      <LayerToast />
      <InfoModal />
    </div>
  );
}
