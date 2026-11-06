"use client";

import React from "react";
import { Thermometer, Sun, Flame, Droplets, ShieldCheck, TrendingDown, Clock, Compass } from "lucide-react";
import type { Conditions, Route } from "@/lib/types";

type Props = {
  conditions?: Conditions;
  route?: Route | null;
  routes?: Route[];
  waterCount?: number;
  restCount?: number;
};

export default function StatsCards({ conditions: c, route, routes, waterCount = 0, restCount = 0 }: Props) {
  const maxSavings = routes && routes.length > 0
    ? Math.max(...routes.map((r) => r.heat_saved_pct || 0))
    : 0;

  const apparentTemp = c?.apparent_temp_c ?? 32;
  const solarLoad = Math.round(c?.solar_w_m2 ?? 650);
  const excessHeat = c?.excess ? Number(c.excess.toFixed(1)) : 0.8;
  const timeMin = route?.minutes ?? 0;
  const heatScore = route?.heat ?? 0;
  const shadePct = route?.shade_pct ?? 0;

  // Determine heat risk level styling
  const isHighRisk = apparentTemp >= 36 || solarLoad > 800;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Feels Like / Steadman Apparent Temp */}
      <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xl p-5 shadow-xs hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-amber-500" />
            Feels Like (AT)
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
            <Flame className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-foreground">
            {apparentTemp}°C
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            {isHighRisk ? "High Heat" : "Moderate"}
          </span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>Ambient: {c?.temp_c ?? 30}°C</span>
          <span className="text-amber-600 dark:text-amber-400 font-medium">Excess: +{excessHeat}</span>
        </div>
      </div>

      {/* 2. NASA Solar Irradiance */}
      <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xl p-5 shadow-xs hover:border-sky-500/40 hover:shadow-lg hover:shadow-sky-500/10 transition-all duration-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-sky-500" />
            NASA Solar Flux
          </span>
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center text-sky-500 group-hover:scale-110 transition-transform">
            <Compass className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-foreground">
            {solarLoad}
          </span>
          <span className="text-sm font-semibold text-muted-foreground">W/m²</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>NASA POWER SW_DWN</span>
          <span className="text-sky-600 dark:text-sky-400 font-medium">Humidity {c?.humidity_pct ?? 55}%</span>
        </div>
      </div>

      {/* 3. Heat Avoidance / Max Savings */}
      <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xl p-5 shadow-xs hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
            Coolest Route Cut
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-emerald-500">
            {maxSavings > 0 ? `−${maxSavings}%` : "0%"}
          </span>
          <span className="text-xs text-muted-foreground">heat exposure</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>Active Shade: <strong>{shadePct}%</strong></span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{heatScore} pts</span>
        </div>
      </div>

      {/* 4. Active Oasis Stations */}
      <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xl p-5 shadow-xs hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/10 transition-all duration-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-teal-500" />
            Relief Oasis
          </span>
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/20 flex items-center justify-center text-teal-500 group-hover:scale-110 transition-transform">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-foreground">
            {timeMin}
          </span>
          <span className="text-sm font-semibold text-muted-foreground">minutes walk</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>💧 {waterCount} water points</span>
          <span>🪑 {restCount} rest hubs</span>
        </div>
      </div>
    </div>
  );
}
