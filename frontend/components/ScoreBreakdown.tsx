"use client";

import React, { useState } from "react";
import { Calculator, Sun, Wind, Droplets, Thermometer, ShieldCheck, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { Conditions, Route } from "@/lib/types";

type Props = {
  route: Route;
  conditions: Conditions;
  formula: Record<string, string>;
  nameOf: (id: string) => string;
};

export default function ScoreBreakdown({ route, conditions: c, formula, nameOf }: Props) {
  const [showFormula, setShowFormula] = useState(false);

  return (
    <section className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
              <Calculator className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Open Mathematical Heat Score Breakdown
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            100% deterministic &amp; explainable: computed live from physical meteorology without black-box ML.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowFormula(!showFormula)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border/80 hover:bg-muted/50 transition-all cursor-pointer self-start sm:self-auto"
        >
          <HelpCircle className="w-3.5 h-3.5 text-primary" />
          {showFormula ? "Hide Formula" : "View Formula"}
          {showFormula ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Atmospheric NASA Conditions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
          <span className="text-[11px] text-muted-foreground block">Air Temp (T2M)</span>
          <span className="text-lg font-black text-foreground flex items-center gap-1 mt-0.5">
            <Thermometer className="w-3.5 h-3.5 text-amber-500" />
            {c.temp_c}°C
          </span>
        </div>
        <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
          <span className="text-[11px] text-muted-foreground block">Relative Humidity</span>
          <span className="text-lg font-black text-foreground flex items-center gap-1 mt-0.5">
            <Droplets className="w-3.5 h-3.5 text-sky-500" />
            {c.humidity_pct}%
          </span>
        </div>
        <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
          <span className="text-[11px] text-muted-foreground block">Steadman AT</span>
          <span className="text-lg font-black text-amber-500 flex items-center gap-1 mt-0.5">
            {c.apparent_temp_c}°C
          </span>
        </div>
        <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
          <span className="text-[11px] text-muted-foreground block">Solar Flux</span>
          <span className="text-lg font-black text-foreground flex items-center gap-1 mt-0.5">
            <Sun className="w-3.5 h-3.5 text-orange-500" />
            {Math.round(c.solar_w_m2)} <span className="text-[10px] font-normal">W/m²</span>
          </span>
        </div>
        <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
          <span className="text-[11px] text-muted-foreground block">Wind Speed</span>
          <span className="text-lg font-black text-foreground flex items-center gap-1 mt-0.5">
            <Wind className="w-3.5 h-3.5 text-teal-500" />
            {c.wind_ms} <span className="text-[10px] font-normal">m/s</span>
          </span>
        </div>
        <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
          <span className="text-[11px] text-muted-foreground block">Thermal Excess</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            +{c.excess.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Formula Card (Expandable) */}
      {showFormula && (
        <div className="p-4 rounded-xl bg-muted/30 border border-primary/20 space-y-2 text-xs">
          <div className="font-bold text-foreground">Transparent Heat Physics Formula:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-muted-foreground">
            {Object.entries(formula).map(([key, val]) => (
              <div key={key} className="p-2.5 rounded-lg bg-card/60 border border-border/60">
                <span className="font-mono font-bold text-primary block mb-0.5">
                  {key.replace(/_/g, " ").toUpperCase()}
                </span>
                <span className="font-mono text-[11px] text-foreground">{val}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            * Surface radiant factors: Asphalt 1.0, Concrete 0.8, Brick 0.6, Grass 0.2. Relief credit capped at 35% of gross heat.
          </p>
        </div>
      )}

      {/* Detailed Segment Table */}
      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border/70">
            <tr>
              <th className="py-2.5 px-3">Segment</th>
              <th className="py-2.5 px-3">Time</th>
              <th className="py-2.5 px-3">Tree Shade</th>
              <th className="py-2.5 px-3">Pavement</th>
              <th className="py-2.5 px-3">Sun Load</th>
              <th className="py-2.5 px-3">Stress / Min</th>
              <th className="py-2.5 px-3 text-right">Heat Exposure</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 font-mono">
            {route.segments.map((s, i) => {
              const [a, b] = s.edge_id.split("-");
              return (
                <tr key={s.edge_id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-3 font-sans font-medium text-foreground">
                    {nameOf(route.path[i] ?? a)} → {nameOf(route.path[i + 1] ?? b)}
                  </td>
                  <td className="py-2 px-3">{s.minutes}m</td>
                  <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                    {Math.round(s.shade * 100)}%
                  </td>
                  <td className="py-2 px-3 capitalize font-sans">{s.surface}</td>
                  <td className="py-2 px-3">{s.sun_load.toFixed(2)}</td>
                  <td className="py-2 px-3">{s.stress_per_min.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-bold text-foreground">
                    {s.heat.toFixed(1)}
                  </td>
                </tr>
              );
            })}

            {/* Oasis Relief Credits */}
            {route.reliefs.map((r) => (
              <tr key={r.kind + r.node} className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <td className="py-2 px-3 font-sans font-bold flex items-center gap-1.5">
                  {r.kind === "water" ? "💧" : "🪑"} {r.name}
                </td>
                <td colSpan={5} className="py-2 px-3 font-sans text-xs">
                  {r.kind === "water" ? "Hydration Oasis Cooling Credit" : "Shaded Rest Stop Relief"}
                </td>
                <td className="py-2 px-3 text-right font-bold">−{r.credit.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/40 font-bold text-foreground border-t-2 border-border/80">
            <tr>
              <td colSpan={6} className="py-2.5 px-3">Gross Heat Exposure</td>
              <td className="py-2.5 px-3 text-right font-mono">{route.gross_heat.toFixed(1)}</td>
            </tr>
            {route.relief_credit > 0 && (
              <tr className="text-emerald-600 dark:text-emerald-400">
                <td colSpan={6} className="py-2 px-3 font-medium">
                  Relief Credits (Hydration &amp; Rest, capped at 35%)
                </td>
                <td className="py-2 px-3 text-right font-mono">−{route.relief_credit.toFixed(1)}</td>
              </tr>
            )}
            <tr className="text-sm bg-primary/10 text-primary">
              <td colSpan={6} className="py-3 px-3 font-extrabold font-sans">
                Final Net Route Heat Score
              </td>
              <td className="py-3 px-3 text-right font-mono font-black text-base">
                {route.heat}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
