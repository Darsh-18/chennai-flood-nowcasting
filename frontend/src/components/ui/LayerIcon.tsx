export type ChennaiLayerId = "flood" | "drainage" | "roads" | "critical" | "route" | "radar" | "relief";

export default function LayerIcon({
  id,
  active,
}: {
  id: ChennaiLayerId;
  active: boolean;
}) {
  const cls = active ? "text-accent" : "text-ink-400";
  const anim = (name: string) => (active ? name : "");

  switch (id) {
    case "radar":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          <path
            d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          />
          <path d="M16 14v6M8 14v6M12 16v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className={anim("veg-drop")} />
        </svg>
      );

    case "relief":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          {/* shelter / tent */}
          <path d="M3 20h18L12 4 3 20z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 4v16M12 14l5 6M12 14l-5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "flood":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          {/* water surface waves */}
          <path
            d="M3 10c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
            className={anim("veg-wave")}
          />
          <path
            d="M3 14c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
            className={anim("veg-wave veg-delay-1")}
          />
          <path
            d="M3 18c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
            className={anim("veg-wave veg-delay-2")}
          />
          {/* raindrop */}
          <path d="M12 2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={anim("veg-drop")} />
        </svg>
      );

    case "drainage":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          {/* network of pipes */}
          <path
            d="M2 8h7v8H2M9 12h6M15 8h7v8h-7"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" className={anim("veg-pulse-core")} />
        </svg>
      );

    case "roads":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          {/* road with centre dashes */}
          <path d="M5 20 12 4l7 16" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path
            d="M9.5 13.5h5"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            pathLength="100" strokeDasharray="100"
            className={anim("veg-trace")}
          />
        </svg>
      );

    case "critical":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          {/* hospital cross inside shield */}
          <path
            d="M12 3l7 3v5c0 4.4-3 8.2-7 9.5C8 19.2 5 15.4 5 11V6l7-3z"
            stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
          />
          <path
            d="M12 9v6M9 12h6"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            className={anim("veg-pulse-core")}
          />
        </svg>
      );

    case "route":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={cls} aria-hidden>
          {/* path with arrow */}
          <path
            d="M3 17c4 0 6-10 10-10"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
            pathLength="100" strokeDasharray="100"
            className={anim("veg-trace")}
          />
          <path
            d="M13 7l8 0-3-3M21 7l-3 3"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
          />
          <circle cx="3" cy="17" r="1.5" fill="currentColor" className={anim("veg-blink")} />
        </svg>
      );

    default:
      return null;
  }
}
