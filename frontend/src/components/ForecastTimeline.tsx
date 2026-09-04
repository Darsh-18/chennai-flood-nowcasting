import { useEffect, useRef } from "react";
import { useFloodStore } from "../state/FloodStore";

const TIMELINE_STEPS = [
  { minutes: 0, label: "NOW", time: "14:30" },
  { minutes: 30, label: "T+30", time: "15:00" },
  { minutes: 60, label: "T+60", time: "15:30" },
  { minutes: 120, label: "T+120", time: "16:30" },
  { minutes: 180, label: "T+180", time: "17:30" },
];

export default function ForecastTimeline({
  onOpenDrawer,
  activeDrawer,
}: {
  onOpenDrawer?: (tab: "route" | "compare" | "data" | "feedback") => void;
  activeDrawer?: string | null;
}) {
  const {
    selectedForecastMinute,
    setSelectedForecastMinute,
    timelinePlaying,
    setTimelinePlaying,
  } = useFloodStore();

  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!timelinePlaying) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      const stepMinutes = [0, 30, 60, 120, 180];
      const currentIndex = stepMinutes.indexOf(selectedForecastMinute);
      const nextMinute = stepMinutes[(currentIndex + 1) % stepMinutes.length];
      setSelectedForecastMinute(nextMinute);
    }, 2500);
    return () => clearInterval(intervalRef.current);
  }, [timelinePlaying, selectedForecastMinute, setSelectedForecastMinute]);

  const getStepProgressPercent = () => {
    if (selectedForecastMinute <= 0) return 0;
    if (selectedForecastMinute <= 30) return 25;
    if (selectedForecastMinute <= 60) return 50;
    if (selectedForecastMinute <= 120) return 75;
    return 100;
  };

  const progressPercent = getStepProgressPercent();

  return (
    <div
      className="fixed bottom-4 z-20 flex items-end gap-3 pointer-events-none"
      style={{
        left: "clamp(296px, 21vw, 360px)",
        right: "clamp(24px, 2vw, 40px)",
      }}
    >
      {/* ── FORECAST TIMELINE CARD (Height: ~104px, non-overlapping clean layout) ── */}
      <div className="pointer-events-auto flex-1 max-w-[560px] min-h-[102px] rounded-2xl border border-white/10 bg-[#0d1527]/95 backdrop-blur-xl px-5 py-3 shadow-2xl flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-400">
            FORECAST TIMELINE
          </span>
          <span className="font-mono text-[10px] text-cyan-400 font-semibold">
            {selectedForecastMinute === 0 ? "OBSERVED NOWCAST" : `PROJECTED +${selectedForecastMinute} MIN`}
          </span>
        </div>

        {/* Track Row & Labels Area */}
        <div className="flex items-center gap-4 mt-2">
          {/* Play / Pause Button */}
          <button
            onClick={() => setTimelinePlaying(!timelinePlaying)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-all shadow-md cursor-pointer"
            aria-label={timelinePlaying ? "Pause timeline" : "Play timeline"}
            title={timelinePlaying ? "Pause" : "Play"}
          >
            {timelinePlaying ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="4" width="4" height="16" rx="1" />
                <rect x="15" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="translate-x-0.5">
                <path d="M6 4l14 8-14 8V4z" />
              </svg>
            )}
          </button>

          {/* Dedicated Vertical Stack: Slider Row → Milestone Labels → Time Labels */}
          <div className="flex-1 flex flex-col gap-1">
            {/* ROW 1: Slider Track with line and dots (ZERO text in this row) */}
            <div className="relative h-6 flex items-center">
              {/* Background Line */}
              <div className="absolute left-3 right-3 h-1 rounded-full bg-slate-700/80" />

              {/* Active Progress Fill */}
              <div
                className="absolute left-3 h-1 rounded-full bg-cyan-400 transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                style={{
                  width: progressPercent === 0 ? "0px" : `calc(${progressPercent}% - 6px)`,
                }}
              />

              {/* Milestone Dots */}
              <div className="relative flex justify-between w-full px-1">
                {TIMELINE_STEPS.map((step) => {
                  const isSelected = step.minutes === selectedForecastMinute;
                  return (
                    <button
                      key={step.label}
                      type="button"
                      onClick={() => setSelectedForecastMinute(step.minutes)}
                      className="flex h-6 w-6 items-center justify-center cursor-pointer focus:outline-none -mx-1"
                      title={`Jump to ${step.label} (${step.time})`}
                    >
                      <span
                        className={`rounded-full transition-all duration-200 ${
                          isSelected
                            ? "h-4 w-4 bg-cyan-400 border-2 border-white shadow-[0_0_12px_#06b6d4] scale-110"
                            : "h-3 w-3 bg-slate-900 border-2 border-slate-500 hover:border-cyan-400 hover:scale-110"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ROW 2: Milestone Labels Row (Placed cleanly BELOW the slider line) */}
            <div className="flex justify-between w-full px-0">
              {TIMELINE_STEPS.map((step) => {
                const isSelected = step.minutes === selectedForecastMinute;
                return (
                  <button
                    key={step.label}
                    type="button"
                    onClick={() => setSelectedForecastMinute(step.minutes)}
                    className="w-10 text-center cursor-pointer focus:outline-none"
                  >
                    <span
                      className={`font-mono text-[11px] font-bold tracking-wider leading-none transition-colors ${
                        isSelected
                          ? "text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.7)]"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ROW 3: Time Labels Row (Placed cleanly BELOW milestone labels) */}
            <div className="flex justify-between w-full px-0 mt-0.5">
              {TIMELINE_STEPS.map((step) => {
                const isSelected = step.minutes === selectedForecastMinute;
                return (
                  <span
                    key={step.time}
                    className={`w-10 text-center font-mono text-[10px] leading-none transition-colors ${
                      isSelected ? "text-cyan-300/90 font-semibold" : "text-slate-500"
                    }`}
                  >
                    {step.time}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTION PILLS (Routing, Compare, Data Status, Feedback) ── */}
      <div className="pointer-events-auto hidden md:flex items-center gap-1.5 rounded-2xl border border-white/10 bg-[#0d1527]/95 backdrop-blur-xl p-1.5 shadow-2xl h-[46px] mb-1">
        <button
          onClick={() => onOpenDrawer?.("route")}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
            activeDrawer === "route"
              ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40"
              : "text-ink-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <circle cx="17" cy="17" r="2" />
          </svg>
          <span>Routing</span>
        </button>

        <button
          onClick={() => onOpenDrawer?.("compare")}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
            activeDrawer === "compare"
              ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40"
              : "text-ink-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>Compare</span>
        </button>

        <button
          onClick={() => onOpenDrawer?.("data")}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
            activeDrawer === "data"
              ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40"
              : "text-ink-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          <span>Data Status</span>
        </button>

        <button
          onClick={() => onOpenDrawer?.("feedback")}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
            activeDrawer === "feedback"
              ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40"
              : "text-ink-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Feedback</span>
        </button>
      </div>
    </div>
  );
}
