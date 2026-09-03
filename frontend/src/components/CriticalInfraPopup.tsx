import { Building2 } from "lucide-react";
import type { GeoJsonFeature, CriticalInfraProperties } from "../types/api";

export default function CriticalInfraPopup({ item }: { item?: GeoJsonFeature<CriticalInfraProperties> }) {
  if (!item) return null;
  return (
    <div className="border border-ops-line bg-white/60 p-3 text-sm">
      <div className="flex items-center gap-2 font-bold">
        <Building2 className="h-4 w-4 text-ops-accent" />
        {item.properties.name}
      </div>
      <div className="mt-1 text-xs text-ops-muted">
        {item.properties.type} · {item.properties.classification}
      </div>
    </div>
  );
}
