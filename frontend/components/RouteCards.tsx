"use client";

import React from "react";
import { Zap, Sparkles, Snowflake, Clock, Flame, ShieldCheck, ChevronRight, Droplets, Armchair } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Route } from "@/lib/types";

type Props = {
  routes: Route[];
  selected: number;
  onSelect: (i: number) => void;
  nameOf: (id: string) => string;
};

const LABEL_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  fastest: {
    label: "Fastest",
    icon: <Zap className="w-3.5 h-3.5 text-amber-500" />,
    color: "text-amber-600 dark:text-amber-400 border-amber-500/30",
    bg: "from-amber-500/10 to-transparent",
  },
  balanced: {
    label: "Recommended",
    icon: <Sparkles className="w-3.5 h-3.5 text-emerald-500" />,
    color: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    bg: "from-emerald-500/15 via-emerald-500/5 to-transparent",
  },
  coolest: {
    label: "Coolest",
    icon: <Snowflake className="w-3.5 h-3.5 text-sky-500" />,
    color: "text-sky-600 dark:text-sky-400 border-sky-500/30",
    bg: "from-sky-500/10 to-transparent",
  },
};

const RISK_BADGES: Record<string, { label: string; variant: "success" | "warning" | "destructive" }> = {
  low: { label: "Low Heat Risk", variant: "success" },
  moderate: { label: "Moderate Heat", variant: "warning" },
  high: { label: "High Heat", variant: "warning" },
  extreme: { label: "Extreme Thermal Risk", variant: "destructive" },
};

export default function RouteCards({ routes, selected, onSelect, nameOf }: Props) {
  const maxHeat = Math.max(...routes.map((r) => r.heat), 1);
  const maxMin = Math.max(...routes.map((r) => r.minutes), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {routes.map((r, i) => {
        const isSel = i === selected;
        const mainLabel = r.labels[0] || "balanced";
        const meta = LABEL_META[mainLabel] || LABEL_META.balanced;
        const riskMeta = RISK_BADGES[r.risk] || RISK_BADGES.moderate;

        const timePct = Math.round((r.minutes / maxMin) * 100);
        const heatPct = Math.round((r.heat / maxHeat) * 100);

        return (
          <button
            key={r.path.join(">")}
            type="button"
            onClick={() => onSelect(i)}
            className={`group relative flex flex-col justify-between p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer overflow-hidden ${
              isSel
                ? "border-primary bg-card shadow-lg ring-2 ring-primary/30 scale-[1.01]"
                : "border-border/80 bg-card/70 backdrop-blur-xl hover:border-primary/40 hover:bg-card hover:shadow-md"
            }`}
          >
            {/* Ambient subtle top gradient */}
            <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${meta.bg} opacity-60 pointer-events-none`} />

            <div className="relative z-10 w-full">
              {/* Header tags */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-wrap gap-1.5">
                  {r.labels.map((l) => (
                    <Badge
                      key={l}
                      variant="outline"
                      className={`text-xs font-bold gap-1 px-2.5 py-0.5 rounded-lg ${
                        LABEL_META[l]?.color || "text-foreground"
                      }`}
                    >
                      {LABEL_META[l]?.icon}
                      {LABEL_META[l]?.label || l}
                    </Badge>
                  ))}
                </div>
                <Badge variant={riskMeta.variant} className="text-[10px]">
                  {riskMeta.label}
                </Badge>
              </div>

              {/* Metrics Progress Bars */}
              <div className="space-y-2.5 my-3">
                {/* Time row */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-500" /> Walk Time
                    </span>
                    <span className="font-bold text-foreground">{r.minutes} min</span>
                  </div>
                  <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-500"
                      style={{ width: `${timePct}%` }}
                    />
                  </div>
                </div>

                {/* Heat row */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-500" /> Heat Score
                    </span>
                    <span className="font-bold text-foreground">{r.heat}</span>
                  </div>
                  <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${heatPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Route Attributes */}
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground border-t border-border/50">
                <span>{Math.round(r.distance_m)} m</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {r.shade_pct}% shaded
                </span>
                {r.water_stops > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-sky-500">
                      <Droplets className="w-3 h-3" /> {r.water_stops}
                    </span>
                  </>
                )}
                {r.rest_stops > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-teal-500">
                      <Armchair className="w-3 h-3" /> {r.rest_stops}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Benefit Delta Banner */}
            <div className="relative z-10 w-full mt-4 pt-3 border-t border-border/60">
              {r.heat_saved_pct > 0 ? (
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    −{r.heat_saved_pct}% heat exposure
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    +{r.extra_minutes_vs_fastest}m vs fast
                  </span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Shortest distance baseline
                </div>
              )}

              {/* Waypoint Trail */}
              <div className="text-[11px] text-muted-foreground truncate mt-2 font-mono">
                via {r.path.slice(1, -1).map(nameOf).join(" → ") || "direct walkway"}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
