import { useEffect, useRef, useState } from "react";

interface GlobeIntroProps {
  onComplete: () => void;
}

export default function GlobeIntro({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phaseText, setPhaseText] = useState("GLOBAL ORBITAL VIEW");
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    // Stars
    const stars: { x: number; y: number; s: number; a: number }[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        s: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.8 + 0.2,
      });
    }

    let progress = 0;
    const duration = 4800; // 4.8 seconds total cinematic transition
    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = now - startTime;
      progress = Math.min(elapsed / duration, 1);

      ctx.clearRect(0, 0, width, height);

      // Deep space background
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        100,
        width / 2,
        height / 2,
        Math.max(width, height)
      );
      bgGrad.addColorStop(0, "#081024");
      bgGrad.addColorStop(1, "#02040a");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Stars
      for (const s of stars) {
        ctx.fillStyle = `rgba(255,255,255,${s.a * (1 - progress * 0.8)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
        ctx.fill();
      }

      // Globe parameters
      const cx = width / 2;
      const cy = height / 2;
      // Start at radius 200, zoom in to 650+ at the end
      const zoomFactor = Math.pow(progress, 2.5);
      const radius = 180 + zoomFactor * 600;

      // Earth rotation: rotates to bring India (lon ~80°E) to center
      const angle = -1.2 + progress * 2.8;

      // Atmosphere outer glow
      const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.9, cx, cy, radius * 1.25);
      glowGrad.addColorStop(0, "rgba(56, 189, 248, 0.45)");
      glowGrad.addColorStop(0.5, "rgba(14, 165, 233, 0.15)");
      glowGrad.addColorStop(1, "rgba(2, 6, 23, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // Earth Globe sphere
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      // Ocean base
      const oceanGrad = ctx.createRadialGradient(
        cx - radius * 0.3,
        cy - radius * 0.3,
        radius * 0.1,
        cx,
        cy,
        radius
      );
      oceanGrad.addColorStop(0, "#0f2b48");
      oceanGrad.addColorStop(0.7, "#081628");
      oceanGrad.addColorStop(1, "#030812");
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

      // Stylized landmass rings / latitude-longitude orbital wireframe
      ctx.strokeStyle = "rgba(56, 189, 248, 0.18)";
      ctx.lineWidth = 1.2;
      for (let lat = -60; lat <= 60; lat += 30) {
        const latY = cy + Math.sin((lat * Math.PI) / 180) * radius * 0.8;
        const latR = Math.cos((lat * Math.PI) / 180) * radius;
        ctx.beginPath();
        ctx.ellipse(cx, latY, latR, latR * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Meridian lines rotating
      for (let lon = 0; lon < 360; lon += 45) {
        const lonAng = ((lon * Math.PI) / 180 + angle) % (Math.PI * 2);
        const lonX = cx + Math.sin(lonAng) * radius;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(Math.cos(lonAng)) * radius, radius, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // India / South Asia subcontinent silhouette projection
      const indiaOffsetAngle = angle + 0.4;
      const indiaVisible = Math.cos(indiaOffsetAngle) > -0.2;
      if (indiaVisible) {
        const indiaX = cx + Math.sin(indiaOffsetAngle) * radius * 0.75;
        const indiaY = cy - radius * 0.15;

        // Draw peninsula outline
        ctx.fillStyle = "rgba(34, 197, 94, 0.28)";
        ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(indiaX - 35 * (radius / 200), indiaY - 45 * (radius / 200));
        ctx.lineTo(indiaX + 35 * (radius / 200), indiaY - 40 * (radius / 200));
        ctx.lineTo(indiaX + 25 * (radius / 200), indiaY + 10 * (radius / 200));
        ctx.lineTo(indiaX, indiaY + 50 * (radius / 200)); // Cape Comorin
        ctx.lineTo(indiaX - 25 * (radius / 200), indiaY + 10 * (radius / 200));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Chennai target pinpoint [13.08° N, 80.27° E] (on the Coromandel coast)
        const chennaiX = indiaX + 15 * (radius / 200);
        const chennaiY = indiaY + 18 * (radius / 200);

        // Radar target pulse
        const pulseR = 8 + (elapsed % 1000) * 0.04 * (radius / 150);
        ctx.strokeStyle = "rgba(6, 182, 212, 0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(chennaiX, chennaiY, pulseR, 0, Math.PI * 2);
        ctx.stroke();

        // Target dot
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(chennaiX, chennaiY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Crosshairs when locked
        if (progress > 0.4) {
          ctx.strokeStyle = "rgba(6, 182, 212, 0.7)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(chennaiX - 16, chennaiY);
          ctx.lineTo(chennaiX + 16, chennaiY);
          ctx.moveTo(chennaiX, chennaiY - 16);
          ctx.lineTo(chennaiX, chennaiY + 16);
          ctx.stroke();
        }
      }

      ctx.restore();

      // Atmospheric limb highlight
      ctx.strokeStyle = "rgba(186, 230, 253, 0.8)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, -Math.PI * 0.8, -Math.PI * 0.1);
      ctx.stroke();

      // Phase update
      if (progress < 0.35) {
        setPhaseText("ORBITAL ROTATION: INDIAN SUBCONTINENT");
      } else if (progress < 0.7) {
        setPhaseText("LOCKING COORDINATES: CHENNAI 13.0827° N, 80.2707° E");
      } else {
        setPhaseText("TRANSITIONING TO CHENNAI GIS COMMAND CENTER…");
      }

      if (progress < 1) {
        animFrame = requestAnimationFrame(render);
      } else {
        setIsFading(true);
        setTimeout(onComplete, 600);
      }
    };

    animFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", onResize);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#060a14] transition-opacity duration-700 select-none ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Top Branding Header */}
      <div className="absolute top-10 flex flex-col items-center text-center pointer-events-none">
        <h1 className="font-display text-3xl md:text-4xl font-black tracking-widest text-white drop-shadow-xl">
          AQUANEX
        </h1>
        <p className="font-mono text-xs font-semibold text-cyan-300 tracking-wider mt-2">
          {phaseText}
        </p>
      </div>

      {/* Bottom Skip Button */}
      <button
        onClick={() => {
          setIsFading(true);
          setTimeout(onComplete, 300);
        }}
        className="absolute bottom-10 right-10 z-10 flex items-center gap-2 rounded-xl border border-white/20 bg-black/50 backdrop-blur-md px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-ink-200 hover:bg-white/20 hover:text-white transition-all shadow-xl"
      >
        <span>SKIP INTRO</span>
        <kbd className="rounded-xs bg-white/10 px-1 text-[10px]">ESC</kbd>
      </button>
    </div>
  );
}
