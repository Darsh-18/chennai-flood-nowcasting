import { Siren } from "lucide-react";
import { useFloodStore } from "../state/FloodStore";

export default function AlertPanel() {
  const { activeStep } = useFloodStore();
  const alert = activeStep?.alert;
  return (
    <section className="border border-ops-line bg-ops-paper p-4">
      <div className="mb-3 flex items-center gap-2">
        <Siren className="h-4 w-4 text-ops-orange" />
        <h2 className="text-sm font-bold">Alert</h2>
      </div>
      <h3 className="text-base font-bold leading-5">{alert?.headline ?? "Prototype nowcast ready"}</h3>
      <p className="mt-2 text-sm leading-5 text-ops-muted">{alert?.detail ?? "Waiting for the first deterministic run."}</p>
      <div className="mt-3 border-l-4 border-ops-accent bg-white/70 p-3 text-sm font-semibold text-ops-ink">
        {alert?.recommended_action ?? "Run the default scenario to populate the dashboard."}
      </div>
    </section>
  );
}
