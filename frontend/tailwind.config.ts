import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Climate & Heat-specific accent tokens
        heat: {
          low: "#10b981",       // Cool emerald
          moderate: "#f59e0b",  // Solar amber
          high: "#f97316",      // Heat orange
          extreme: "#ef4444",   // Extreme crimson
        },
        nasa: {
          blue: "#0b3d91",
          red: "#fc3d21",
          cyan: "#38bdf8",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.4", transform: "scale(0.98)" },
          "50%": { opacity: "0.85", transform: "scale(1.02)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        heatWave: {
          "0%": { transform: "translateY(0) scaleY(1)" },
          "50%": { transform: "translateY(-3px) scaleY(1.05)" },
          "100%": { transform: "translateY(0) scaleY(1)" },
        },
        dash: {
          to: { strokeDashoffset: "-40" },
        },
      },
      animation: {
        shimmer: "shimmer 2.5s infinite linear",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        "heat-wave": "heatWave 3s ease-in-out infinite",
        dash: "dash 1.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
