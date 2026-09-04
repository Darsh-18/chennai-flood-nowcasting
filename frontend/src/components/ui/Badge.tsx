/** Visual badge utilities for the Chennai command-center UI. */

export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-400">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" aria-hidden />
      DEMO
    </span>
  );
}

export function SimulatedBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-amber-400/80">
      SIMULATED
    </span>
  );
}

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
      LIVE
    </span>
  );
}

const RISK_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  safe:   { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "SAFE" },
  watch:  { bg: "bg-yellow-500/15",  text: "text-yellow-400",  label: "WATCH" },
  likely: { bg: "bg-orange-500/15",  text: "text-orange-400",  label: "LIKELY" },
  severe: { bg: "bg-red-500/15",     text: "text-red-400",     label: "SEVERE" },
};

export function RiskBadge({ level }: { level: string }) {
  const style = RISK_BADGE[level] ?? RISK_BADGE.safe;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}

const CLASS_BADGE: Record<string, string> = {
  OBSERVED:  "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  DERIVED:   "bg-sky-500/15 text-sky-400 border border-sky-500/20",
  INFERRED:  "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  SIMULATED: "bg-red-500/15 text-red-400 border border-red-500/20",
};

export function ClassificationBadge({ label }: { label: string }) {
  const cls = CLASS_BADGE[label] ?? "bg-ink-700 text-ink-300 border border-ink-600";
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}
