import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
          green: "#44875f"
        }
      },
      boxShadow: {
        panel: "0 18px 48px rgba(31, 42, 39, 0.12)"
      }
    },
  },
  plugins: [],
} satisfies Config;
