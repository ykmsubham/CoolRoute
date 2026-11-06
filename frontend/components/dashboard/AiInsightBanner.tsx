"use client";

import React from "react";
import { Sparkles, ShieldAlert, ArrowRight, RefreshCw, Cpu, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Explanation, Route } from "@/lib/types";

type Props = {
  explanation?: Explanation;
  route?: Route | null;
  onRefresh?: () => void;
  isLoading?: boolean;
};

export default function AiInsightBanner({ explanation, route, onRefresh, isLoading }: Props) {
  const sourceName = explanation?.source === "claude"
    ? "Claude 3.5 Sonnet"
    : explanation?.source === "gemini"
    ? "Gemini 2.5 Flash"
    : "Deterministic Heat Physics Engine";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/20 via-primary/10 to-amber-950/15 border border-emerald-500/30 p-5 shadow-xs transition-all duration-300">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400 shadow-xs">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold text-foreground">
                AI Climate Copilot &amp; Route Guidance
              </span>
              <Badge variant="success" className="text-[11px] font-semibold">
                NASA POWER Synced
              </Badge>
              <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground border-emerald-500/30">
                <Cpu className="w-3 h-3 mr-1 text-emerald-500" />
                {sourceName}
              </Badge>
            </div>
            <p className="text-sm text-foreground/90 max-w-3xl leading-relaxed">
              {explanation?.text ||
                (route?.heat_saved_pct && route.heat_saved_pct > 0
                  ? `Recommended route cuts heat exposure by ${route.heat_saved_pct}% for only +${route.extra_minutes_vs_fastest} min of walking, leveraging tree canopies along shaded corridors.`
                  : "Walk safely: midday heat load peaks between 12:00–15:00. Stay hydrated at campus water stations and prefer tree-lined corridors.")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-card/80 border border-border/80 hover:border-emerald-500/40 text-foreground transition-all shadow-2xs hover:shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-500" : ""}`} />
              Re-analyze
            </button>
          )}
          <a
            href="https://power.larc.nasa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
          >
            NASA Data Spec
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
