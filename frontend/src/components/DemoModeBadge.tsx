import { ShieldCheck, TriangleAlert } from "lucide-react";
import { useFloodStore } from "../state/FloodStore";

export default function DemoModeBadge() {
  const { health } = useFloodStore();
  const fallback = health?.fallback;
  return (
    <div
      className={`flex items-center gap-2 border px-3 py-2 text-xs font-semibold ${
        fallback ? "border-ops-orange text-ops-orange" : "border-ops-accent text-ops-accentDark"
      }`}
      title={fallback ? "Live adapter was unavailable" : "Using deterministic bundled data"}
    >
      {fallback ? <TriangleAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
      <span>{fallback ? "Fell back to Demo Mode" : "DEMO / REPLAY MODE"}</span>
    </div>
  );
}
