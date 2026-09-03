import { Navigation } from "lucide-react";
import type { RouteResponse } from "../types/api";

export default function RouteExplanationCard({ route }: { route?: RouteResponse }) {
  if (!route) {
    return (
      <div className="border border-ops-line bg-white/60 p-3 text-sm text-ops-muted">
        Simulated routing scenario will appear after route calculation.
      </div>
    );
  }

  return (
    <div className="border border-ops-line bg-white/70 p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Navigation className="h-4 w-4 text-ops-accent" />
        {route.simulated_label}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="border border-ops-line bg-ops-paper p-2">
          <div className="text-xs font-bold uppercase text-ops-muted">Normal</div>
          <div className="mt-1 font-bold">{route.normal_route.distance_km.toFixed(2)} km</div>
          <div className="text-xs text-ops-muted">{route.normal_route.eta_min.toFixed(1)} min</div>
        </div>
        <div className="border border-ops-line bg-ops-paper p-2">
          <div className="text-xs font-bold uppercase text-ops-muted">Flood-aware</div>
          <div className="mt-1 font-bold">{route.flood_aware_route.distance_km.toFixed(2)} km</div>
          <div className="text-xs text-ops-muted">{route.flood_aware_route.eta_min.toFixed(1)} min</div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-5 text-ops-ink">{route.explanation}</p>
    </div>
  );
}
