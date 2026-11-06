"use client";

import React from "react";
import { Sliders, Flame, CloudSun, DropletOff, Construction, RotateCcw } from "lucide-react";
import type { Scenario } from "@/lib/types";

type Props = {
  presets: Record<string, Scenario>;
  active: Scenario | null;
  onChange: (s: Scenario | null) => void;
};

const NEUTRAL: Scenario = {
  temp_delta: 0,
  humidity_delta: 0,
  solar_scale: 1,
  closed_edges: [],
  disabled_points: [],
  label: "Custom",
};

const PRESETS_META: Record<string, { label: string; icon: React.ReactNode; desc: string; color: string }> = {
  heatwave: {
    label: "Heatwave",
    icon: <Flame className="w-3.5 h-3.5 text-red-500" />,
    desc: "+5°C heat spike",
    color: "border-red-500/30 hover:border-red-500/60 bg-red-500/10",
  },
  cloud_cover: {
    label: "Cloud cover",
    icon: <CloudSun className="w-3.5 h-3.5 text-sky-400" />,
    desc: "30% sunlight",
    color: "border-sky-500/30 hover:border-sky-500/60 bg-sky-500/10",
  },
  water_outage: {
    label: "Water offline",
    icon: <DropletOff className="w-3.5 h-3.5 text-amber-500" />,
    desc: "No refill points",
    color: "border-amber-500/30 hover:border-amber-500/60 bg-amber-500/10",
  },
  road_closed: {
    label: "Path closed",
    icon: <Construction className="w-3.5 h-3.5 text-orange-500" />,
    desc: "Route blocked",
    color: "border-orange-500/30 hover:border-orange-500/60 bg-orange-500/10",
  },
};

export default function ConditionSimulator({ presets, active, onChange }: Props) {
  const cur = active ?? NEUTRAL;
  const set = (patch: Partial<Scenario>) => onChange({ ...cur, ...patch, label: "Custom" });

  return (
    <section className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Climate Stress Simulator</h3>
            <p className="text-xs text-muted-foreground">Test route resilience under extreme shifts</p>
          </div>
        </div>
        {active && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-lg border border-border/80 hover:bg-muted transition-all cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Preset Chips */}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(PRESETS_META).map(([k, meta]) => {
          const preset = presets[k];
          if (!preset) return null;
          const isActive = active?.label === preset.label;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange(isActive ? null : preset)}
              className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                isActive
                  ? "border-primary bg-primary/15 ring-2 ring-primary/25 shadow-xs"
                  : "border-border/70 bg-card/40 hover:bg-muted/40 hover:border-border"
              }`}
            >
              <div className="mt-0.5">{meta.icon}</div>
              <div>
                <div className="text-xs font-bold text-foreground">{meta.label}</div>
                <div className="text-[10px] text-muted-foreground">{meta.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Fine-Tuning Sliders */}
      <div className="space-y-3 pt-2 border-t border-border/60">
        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span className="text-muted-foreground">Temperature Shift</span>
            <span className="font-mono font-bold text-foreground">
              {cur.temp_delta > 0 ? `+${cur.temp_delta}` : cur.temp_delta}°C
            </span>
          </div>
          <input
            type="range"
            min={-8}
            max={10}
            step={1}
            value={cur.temp_delta}
            onChange={(e) => set({ temp_delta: Number(e.target.value) })}
            className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span className="text-muted-foreground">Relative Humidity Shift</span>
            <span className="font-mono font-bold text-foreground">
              {cur.humidity_delta > 0 ? `+${cur.humidity_delta}` : cur.humidity_delta}%
            </span>
          </div>
          <input
            type="range"
            min={-30}
            max={30}
            step={5}
            value={cur.humidity_delta}
            onChange={(e) => set({ humidity_delta: Number(e.target.value) })}
            className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span className="text-muted-foreground">Solar Radiative Intensity</span>
            <span className="font-mono font-bold text-foreground">
              {Math.round(cur.solar_scale * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={cur.solar_scale}
            onChange={(e) => set({ solar_scale: Number(e.target.value) })}
            className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </section>
  );
}
