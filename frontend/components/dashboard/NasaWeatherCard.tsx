"use client";

import React, { useEffect, useState, useRef } from "react";
import { Sun, CloudSun, Wind, Droplets, Play, Pause, RotateCcw, Satellite, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type WeatherHour = {
  hour: number;
  t: number;
  rh: number;
  ws: number;
  sw: number;
};

type Props = {
  weather: WeatherHour[];
  currentHour: number;
  onHourChange: (hour: number | ((prev: number) => number)) => void;
};

const fmtHour = (h: number) => `${String(h).padStart(2, "0")}:00`;

export default function NasaWeatherCard({ weather, currentHour, onHourChange }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cur = weather.find((w) => w.hour === currentHour) || weather[13] || {
    hour: currentHour,
    t: 31,
    rh: 60,
    ws: 2.2,
    sw: 650,
  };

  // Automated 24-hr simulation loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        onHourChange((prevHour: number) => (prevHour + 1) % 24);
      }, 1200);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, onHourChange]);

  const maxSw = Math.max(...weather.map((w) => w.sw), 1);
  const maxTemp = Math.max(...weather.map((w) => w.t), 1);

  return (
    <div className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl p-5 shadow-xs transition-all duration-300">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center text-sky-500">
            <Satellite className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">NASA POWER Climatology</h3>
              <Badge variant="nasa" className="text-[10px] tracking-wide uppercase font-bold">
                Satellite Synced
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Hourly Solar Radiation &amp; Surface Meteorology (NASA POWER Column Standards)
            </p>
          </div>
        </div>

        {/* Play/Pause Simulation Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
              isPlaying
                ? "bg-amber-500 text-white shadow-amber-500/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                Pause Sim
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Play 24h Sim
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              onHourChange(13);
            }}
            title="Reset to 13:00 Peak Sun"
            className="p-1.5 rounded-xl border border-border hover:bg-accent/15 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 Telemetry Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Air Temp (T2M)</span>
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black mt-1 text-foreground">{cur.t}°C</div>
          <div className="text-[10px] text-muted-foreground">Diurnal peak: {maxTemp}°C</div>
        </div>

        <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Solar Flux (SW_DWN)</span>
            <CloudSun className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="text-xl font-black mt-1 text-foreground">{Math.round(cur.sw)} <span className="text-xs font-medium">W/m²</span></div>
          <div className="text-[10px] text-muted-foreground">Peak irradiance: {Math.round(maxSw)} W/m²</div>
        </div>

        <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Humidity (RH2M)</span>
            <Droplets className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="text-xl font-black mt-1 text-foreground">{cur.rh}%</div>
          <div className="text-[10px] text-muted-foreground">Relative moisture</div>
        </div>

        <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Wind Speed (WS2M)</span>
            <Wind className="w-3.5 h-3.5 text-teal-500" />
          </div>
          <div className="text-xl font-black mt-1 text-foreground">{cur.ws} <span className="text-xs font-medium">m/s</span></div>
          <div className="text-[10px] text-muted-foreground">Convective cooling</div>
        </div>
      </div>

      {/* Diurnal 24-hr Bar Visualizer */}
      <div className="mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <span className="text-muted-foreground">Solar Radiation Curve Across Day</span>
          <span className="text-primary font-mono font-bold bg-primary/10 px-2 py-0.5 rounded-md">
            {fmtHour(currentHour)}
          </span>
        </div>

        {/* 24 hour interactive bar chart */}
        <div className="grid grid-cols-24 gap-1 h-14 items-end bg-background/50 p-1.5 rounded-xl border border-border/60">
          {weather.map((w) => {
            const isSelected = w.hour === currentHour;
            const barHeightPct = Math.max(8, Math.round((w.sw / maxSw) * 100));
            return (
              <button
                key={w.hour}
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  onHourChange(w.hour);
                }}
                title={`${fmtHour(w.hour)}: ${Math.round(w.sw)} W/m², ${w.t}°C`}
                className={`group relative flex flex-col items-center justify-end h-full w-full rounded-xs transition-all cursor-pointer ${
                  isSelected ? "bg-amber-500 shadow-xs shadow-amber-500/50" : "bg-muted hover:bg-amber-500/40"
                }`}
                style={{ height: `${barHeightPct}%` }}
              >
                {isSelected && (
                  <span className="absolute -top-6 text-[10px] font-bold text-amber-500 bg-card px-1 py-0.2 rounded border border-amber-500/30 whitespace-nowrap z-20 shadow-xs">
                    {fmtHour(w.hour)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Slider control */}
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground font-mono">00:00</span>
          <input
            type="range"
            min={0}
            max={23}
            value={currentHour}
            onChange={(e) => {
              setIsPlaying(false);
              onHourChange(Number(e.target.value));
            }}
            className="w-full accent-primary cursor-pointer h-2 bg-muted rounded-lg"
          />
          <span className="text-[11px] text-muted-foreground font-mono">23:00</span>
        </div>
      </div>
    </div>
  );
}
