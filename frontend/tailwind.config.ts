import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Legacy ops-* tokens (kept for backward-compat; gradually replaced) ──
        ops: {
          ink: "#1f2a27",
          muted: "#65726d",
          line: "#c8d0c8",
          paper: "#f7f9f4",
          panel: "#eef2ea",
          field: "#e2e7dd",
          accent: "#2f6f5e",
          accentDark: "#214f44",
          yellow: "#d9aa32",
          orange: "#c46b2d",
          red: "#b33a3a",
          green: "#44875f",
        },
        // ── Vegvisir-inspired dark palette ──
        ink: {
          950: "#05070d",
          900: "#0a0e1a",
          800: "#111827",
          700: "#1c2536",
          600: "#263045",
          500: "#374159",
          400: "#8b98b8",
          300: "#aab6d4",
          200: "#cbd5e8",
          100: "#e8edf7",
        },
        accent: {
          DEFAULT: "#38bdf8",
          dim: "#0ea5e9",
          muted: "rgba(56,189,248,0.15)",
        },
        sev: {
          green: "#22c55e",
          yellow: "#eab308",
          orange: "#f97316",
          red: "#ef4444",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["'Inter'", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        panel: "0 18px 48px rgba(31, 42, 39, 0.12)",
        glass: "0 8px 32px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.06)",
        glow: "0 0 24px rgba(56,189,248,0.25)",
        "glow-sm": "0 0 12px rgba(56,189,248,0.18)",
      },
      backdropBlur: {
        xs: "2px",
        sm: "6px",
        md: "12px",
        lg: "20px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        ticker: "ticker 40s linear infinite",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-left": "slideLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideLeft: {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
