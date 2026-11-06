"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sun,
  Moon,
  ArrowRightLeft,
  Navigation,
  Compass,
  AlertTriangle,
  RefreshCw,
  Droplets,
  Heart,
  Layers,
  MapPin,
  Sparkles,
  Info,
  ExternalLink
} from "lucide-react";
import CampusMap from "@/components/CampusMap";
import ConditionSimulator from "@/components/ConditionSimulator";
import RouteCards from "@/components/RouteCards";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import SponsorModal from "@/components/SponsorModal";
import StatsCards from "@/components/dashboard/StatsCards";
import AiInsightBanner from "@/components/dashboard/AiInsightBanner";
import NasaWeatherCard from "@/components/dashboard/NasaWeatherCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCampus, planRoutes, rerouteFor } from "@/lib/api";
import type { Campus, Node, PlanResult, RerouteResult, Scenario } from "@/lib/types";

const fmtHour = (h: number) => `${String(h).padStart(2, "0")}:00`;

export default function Page() {
  const [campus, setCampus] = useState<Campus | null>(null);
  const [origin, setOrigin] = useState("GATE");
  const [dest, setDest] = useState("HOS");
  const [hour, setHour] = useState(13);
  const [scenario, setScenario] = useState<Scenario | null>(null);

  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [rr, setRr] = useState<RerouteResult | null>(null);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sponsor, setSponsor] = useState<Node | null>(null);
  const [isDark, setIsDark] = useState(true);
  const reqId = useRef(0);

  // Sync dark mode class to documentElement
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const loadCampus = useCallback(async () => {
    try {
      setCampus(await getCampus());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot reach the CoolRoute API");
    }
  }, []);

  useEffect(() => {
    loadCampus();
  }, [loadCampus]);

  // Plan (or reroute) whenever inputs change.
  useEffect(() => {
    if (!campus || origin === dest) return;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        if (scenario) {
          const r = await rerouteFor(origin, dest, hour, scenario);
          if (id !== reqId.current) return;
          setRr(r);
          setPlan(r.after);
        } else {
          const p = await planRoutes(origin, dest, hour);
          if (id !== reqId.current) return;
          setRr(null);
          setPlan(p);
        }
      } catch (e) {
        if (id === reqId.current) {
          setError(e instanceof Error ? e.message : "Routing calculation failed");
        }
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [campus, origin, dest, hour, scenario]);

  // Default selection = recommended route
  useEffect(() => {
    if (!plan?.routes.length) return;
    const i = plan.routes.findIndex((r) => r.path.join() === plan.recommended?.join());
    setSelected(i >= 0 ? i : 0);
  }, [plan]);

  const nameOf = useMemo(() => {
    const m = new Map((campus?.nodes ?? []).map((n): [string, string] => [n.id, n.name]));
    return (id: string) => m.get(id) ?? id;
  }, [campus]);

  const route = plan?.routes[selected] ?? null;
  const ghost =
    rr?.route_changed && rr.before.recommended
      ? rr.before.routes.find((r) => r.path.join() === rr.before.recommended?.join()) ?? null
      : null;
  const explanation = rr?.explanation ?? plan?.explanation;
  const weatherNow = campus?.weather.find((w) => w.hour === hour);

  const swap = () => {
    setOrigin(dest);
    setDest(origin);
  };

  const waterCount = campus?.nodes.filter((n) => n.water).length || 0;
  const restCount = campus?.nodes.filter((n) => n.rest).length || 0;

  return (
    <main className="relative min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Background ambient lighting effects */}
      <div className="fixed inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      <div className="fixed inset-0 bg-radial-gradient pointer-events-none" />

      {/* Modern Top Header / Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-foreground">
                  CoolRoute
                </h1>
                <Badge variant="success" className="text-[10px] uppercase font-bold tracking-wider">
                  Climate Resilient
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Heat-Aware Walking Navigation · ITER Campus 1 | Heat-Aware Mobility
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* NASA Telemetry Pill */}
            {weatherNow && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/60 border border-border/80 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-amber-500 font-bold">{fmtHour(hour)}</span>
                <span className="text-muted-foreground">|</span>
                <span>{weatherNow.t}°C</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-sky-500">{Math.round(weatherNow.sw)} W/m²</span>
              </div>
            )}

            {/* Dark / Light Toggle */}
            <button
              type="button"
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 rounded-xl border border-border/80 bg-card hover:bg-muted/80 text-foreground transition-all shadow-xs cursor-pointer"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Quick Sponsor CTA */}
            <Button
              variant="emerald"
              size="sm"
              onClick={() => {
                const firstWater = campus?.nodes.find((n) => n.water);
                if (firstWater) setSponsor(firstWater);
              }}
              className="gap-1.5 font-bold"
            >
              <Droplets className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sponsor Oasis</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 relative z-10">
        {/* Error notification banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. AI Climate Insight Banner */}
        <AiInsightBanner
          explanation={explanation}
          route={route}
          isLoading={loading}
          onRefresh={() => {
            if (campus) {
              const cur = hour;
              setHour((cur + 1) % 24);
              setTimeout(() => setHour(cur), 50);
            }
          }}
        />

        {/* 2. Top-level Stats Cards */}
        <StatsCards
          conditions={plan?.conditions}
          route={route}
          routes={plan?.routes}
          waterCount={waterCount}
          restCount={restCount}
        />

        {/* Dynamic Reroute Alert Banner */}
        {rr && (
          <div
            className={`p-4 rounded-2xl border transition-all ${
              rr.route_changed
                ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>{rr.route_changed ? "Route dynamically rerouted" : "Current route remains optimal"}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-card border border-border text-foreground font-semibold">
                {scenario?.label}
              </span>
            </div>
            <ul className="mt-2 text-xs space-y-1 list-disc list-inside">
              {rr.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
              {rr.route_changed && rr.comparison && (
                <li>
                  Old route would take {rr.comparison.old_minutes} min / heat {rr.comparison.old_heat}. New route:{" "}
                  <strong>{rr.comparison.new_minutes} min</strong> / heat <strong>{rr.comparison.new_heat}</strong>.
                </li>
              )}
            </ul>
          </div>
        )}

        {/* 3. Core Dashboard Section: Integrated Map, Controls & NASA Climatology HUD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Trip Planner & Climate Stress Simulator (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Trip Route Configuration Panel */}
            <div className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Walking Journey</h3>
                    <p className="text-xs text-muted-foreground">Select origin &amp; destination</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  Campus Zone 1
                </Badge>
              </div>

              {/* Origin Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  Start Location (From)
                </label>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  {campus?.nodes.map((n) => (
                    <option key={n.id} value={n.id} disabled={n.id === dest}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-1">
                <button
                  type="button"
                  onClick={swap}
                  className="p-2 rounded-xl border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-xs hover:rotate-180 duration-300 cursor-pointer"
                  title="Swap start & destination"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Destination Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  Target Destination (To)
                </label>
                <select
                  value={dest}
                  onChange={(e) => setDest(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  {campus?.nodes.map((n) => (
                    <option key={n.id} value={n.id} disabled={n.id === origin}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Climate Stress Scenario Simulator */}
            {campus?.presets && (
              <ConditionSimulator
                presets={campus.presets}
                active={scenario}
                onChange={setScenario}
              />
            )}
          </div>

          {/* Right Column: Interactive Campus Map & Live NASA HUD (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Campus SVG Map */}
            {campus && (
              <div className="relative">
                <CampusMap
                  nodes={campus.nodes}
                  edges={campus.edges}
                  route={route}
                  ghostRoute={ghost}
                  origin={origin}
                  dest={dest}
                  closedEdges={scenario?.closed_edges ?? []}
                  disabledPoints={scenario?.disabled_points ?? []}
                  onPointClick={setSponsor}
                />
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>💡 Tip: Click on any 💧 water station or 🪑 rest point to sponsor upkeep.</span>
                  {loading && <span className="text-primary font-bold animate-pulse">Calculating optimal corridors…</span>}
                </div>
              </div>
            )}

            {/* NASA POWER Live Weather & 24-hr Simulation HUD */}
            {campus?.weather && (
              <NasaWeatherCard
                weather={campus.weather}
                currentHour={hour}
                onHourChange={(newHour) => {
                  if (typeof newHour === "function") {
                    setHour((prev) => (newHour as (p: number) => number)(prev));
                  } else {
                    setHour(newHour);
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* 4. Route Comparison Cards */}
        {plan && !plan.reachable && (
          <div className="p-6 rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive text-center font-bold">
            No route is passable under these simulated road closures.
          </div>
        )}

        {plan?.reachable && (
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Available Routes &amp; Heat Trade-Offs</h2>
                <p className="text-xs text-muted-foreground">Compare time penalty against heat exposure reduction</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {plan.routes.length} paths computed
              </Badge>
            </div>

            <RouteCards
              routes={plan.routes}
              selected={selected}
              onSelect={setSelected}
              nameOf={nameOf}
            />

            {/* 5. Open Mathematical Heat Score Breakdown Table */}
            {route && (
              <ScoreBreakdown
                route={route}
                conditions={plan.conditions}
                formula={campus?.formula || {}}
                nameOf={nameOf}
              />
            )}
          </div>
        )}
      </div>

      {/* Sponsor Checkout Modal */}
      {sponsor && (
        <SponsorModal
          point={campus?.nodes.find((n) => n.id === sponsor.id) ?? sponsor}
          onClose={() => setSponsor(null)}
          onPaid={loadCampus}
        />
      )}
    </main>
  );
}
