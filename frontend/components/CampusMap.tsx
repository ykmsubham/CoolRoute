"use client";

import React, { useState, useMemo } from "react";
import { Eye, Layers, Droplets, Armchair, Sparkles, Navigation, Info, ShieldAlert } from "lucide-react";
import type { Edge, Node, Route } from "@/lib/types";

type Props = {
  nodes: Node[];
  edges: Edge[];
  route?: Route | null;
  ghostRoute?: Route | null;
  origin: string;
  dest: string;
  closedEdges: string[];
  disabledPoints: string[];
  onPointClick: (node: Node) => void;
};

// Edge colour encodes shade: full sun = hot crimson/orange, full canopy = lush emerald.
function shadeColor(shade: number) {
  const hue = 14 + shade * 125; // 14 (crimson/orange) -> 139 (emerald)
  const light = 50 - shade * 6;
  return `hsl(${hue} 75% ${light}%)`;
}

function surfaceLabel(s: string) {
  switch (s) {
    case "grass": return "🌿 Grass (0.2x radiant heat)";
    case "brick": return "🧱 Brick (0.6x radiant heat)";
    case "concrete": return "🏛️ Concrete (0.8x radiant heat)";
    default: return "🛣️ Asphalt (1.0x radiant heat)";
  }
}

function pathD(path: string[], byId: Map<string, Node>) {
  return path
    .map((id, i) => {
      const n = byId.get(id);
      return n ? `${i === 0 ? "M" : "L"}${n.x},${n.y}` : "";
    })
    .join(" ");
}

export default function CampusMap({
  nodes,
  edges,
  route,
  ghostRoute,
  origin,
  dest,
  closedEdges,
  disabledPoints,
  onPointClick,
}: Props) {
  const [showShadeHeatmap, setShowShadeHeatmap] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<Edge | null>(null);

  const byId = useMemo(() => new Map(nodes.map((n): [string, Node] => [n.id, n])), [nodes]);
  const closed = useMemo(() => new Set(closedEdges), [closedEdges]);
  const disabled = useMemo(() => new Set(disabledPoints), [disabledPoints]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl shadow-xs">
      {/* Interactive Floating Map Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 bg-card/90 backdrop-blur-md p-1.5 rounded-xl border border-border/80 shadow-xs">
        <button
          type="button"
          onClick={() => setShowShadeHeatmap(!showShadeHeatmap)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            showShadeHeatmap
              ? "bg-primary/15 text-primary border border-primary/20"
              : "text-muted-foreground hover:bg-accent/15 hover:text-foreground"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Shade Layer
        </button>
        <button
          type="button"
          onClick={() => setShowPoints(!showPoints)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            showPoints
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              : "text-muted-foreground hover:bg-accent/15 hover:text-foreground"
          }`}
        >
          <Droplets className="w-3.5 h-3.5" />
          Oasis Points
        </button>
      </div>

      {/* SVG Canvas Map */}
      <svg
        viewBox="0 0 1000 640"
        className="w-full h-auto block select-none"
        role="img"
        aria-label="Campus map showing shade, water points and heat-safe walking routes"
      >
        <defs>
          <linearGradient id="shadeLegendGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(14 80% 48%)" />
            <stop offset="50%" stopColor="hsl(45 90% 50%)" />
            <stop offset="100%" stopColor="hsl(139 75% 42%)" />
          </linearGradient>

          {/* Glowing filter for active walking route */}
          <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Map Canvas Background with subtle grid */}
        <rect x="0" y="0" width="1000" height="640" rx="16" fill="hsl(var(--card))" />

        {/* Base Grid lines */}
        <g stroke="hsl(var(--border) / 0.4)" strokeWidth="1" strokeDasharray="4 6">
          {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((x) => (
            <line key={`gx-${x}`} x1={x} y1="0" x2={x} y2="640" />
          ))}
          {[100, 200, 300, 400, 500, 600].map((y) => (
            <line key={`gy-${y}`} x1="0" y1={y} x2="1000" y2={y} />
          ))}
        </g>

        {/* Base Network Edges */}
        {edges.map((e) => {
          const a = byId.get(e.a);
          const b = byId.get(e.b);
          if (!a || !b) return null;
          const isClosed = closed.has(e.id);
          const edgeColor = isClosed
            ? "hsl(var(--muted-foreground))"
            : showShadeHeatmap
            ? shadeColor(e.shade)
            : "hsl(var(--muted))";

          return (
            <g
              key={e.id}
              className="cursor-pointer group"
              onMouseEnter={() => setHoveredEdge(e)}
              onMouseLeave={() => setHoveredEdge(null)}
            >
              {/* Hit target line */}
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="hsl(var(--muted))"
                strokeWidth="16"
                strokeLinecap="round"
                opacity="0.9"
              />
              {/* Rendered path */}
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={edgeColor}
                strokeWidth={isClosed ? 5 : 8}
                strokeDasharray={isClosed ? "6 8" : undefined}
                strokeLinecap="round"
                opacity={isClosed ? 0.45 : 0.65}
                className="transition-all duration-200 group-hover:opacity-100 group-hover:stroke-width-[10]"
              />
              {isClosed && (
                <text
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 + 7}
                  textAnchor="middle"
                  fontSize="20"
                  fontWeight="bold"
                  fill="hsl(var(--destructive))"
                >
                  ✕
                </text>
              )}
            </g>
          );
        })}

        {/* Previous Route (Ghost Route shown after dynamic rerouting) */}
        {ghostRoute && (
          <path
            d={pathD(ghostRoute.path, byId)}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="5"
            strokeDasharray="4 8"
            strokeLinecap="round"
            opacity={0.85}
          />
        )}

        {/* Active Selected Route */}
        {route && (
          <g filter="url(#routeGlow)">
            {/* White/Accent underlay outline */}
            <path
              d={pathD(route.path, byId)}
              fill="none"
              stroke="#ffffff"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
            {/* Gradient animated walking route flow */}
            <path
              d={pathD(route.path, byId)}
              fill="none"
              stroke="#10b981"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="14 10"
              className="animate-dash"
            />
          </g>
        )}

        {/* Nodes / Intersections & Relief Points */}
        {nodes.map((n) => {
          const isPoint = (n.water || n.rest) && showPoints;
          const off = disabled.has(n.id);
          const isOrigin = n.id === origin;
          const isDest = n.id === dest;
          const isEndpoint = isOrigin || isDest;
          const onRoute = route?.path.includes(n.id);

          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              className="cursor-pointer transition-transform duration-200"
              onClick={() => isPoint && onPointClick(n)}
              onMouseEnter={() => setHoveredNode(n)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Origin / Destination glowing halo */}
              {isEndpoint && (
                <circle
                  r="28"
                  fill="none"
                  stroke={isOrigin ? "#10b981" : "#f59e0b"}
                  strokeWidth="3.5"
                  strokeDasharray="5 5"
                  className="animate-pulse"
                />
              )}

              {/* Node Outer Circle */}
              <circle
                r={isPoint ? 17 : 10}
                fill={off ? "hsl(var(--muted))" : isEndpoint ? (isOrigin ? "#10b981" : "#f59e0b") : "hsl(var(--card))"}
                stroke={onRoute ? "#10b981" : "hsl(var(--border))"}
                strokeWidth={onRoute ? 4 : 2}
                className="shadow-sm"
              />

              {/* Water & Rest Emoji Icons */}
              {isPoint && n.water && (
                <text y="6" textAnchor="middle" fontSize="18" opacity={off ? 0.35 : 1}>
                  💧
                </text>
              )}
              {isPoint && !n.water && n.rest && (
                <text y="6" textAnchor="middle" fontSize="17" opacity={off ? 0.35 : 1}>
                  🪑
                </text>
              )}
              {isPoint && n.water && n.rest && (
                <text x="18" y="-10" fontSize="14">
                  🪑
                </text>
              )}
              {off && (
                <text y="7" textAnchor="middle" fontSize="20" fill="hsl(var(--destructive))" fontWeight="bold">
                  ✕
                </text>
              )}

              {/* Label below node */}
              <text
                y={isPoint ? 36 : 28}
                textAnchor="middle"
                fontSize={isEndpoint ? "15" : "13"}
                fontWeight={isEndpoint ? "800" : "600"}
                fill="hsl(var(--foreground))"
                stroke="hsl(var(--card))"
                strokeWidth="4"
                paintOrder="stroke"
              >
                {n.name}
              </text>
            </g>
          );
        })}

        {/* Modern Map Legend */}
        <g transform="translate(24,570)">
          <rect x="-12" y="-20" width="540" height="52" rx="14" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.95" />
          <text x="0" y="2" fontWeight="700" fontSize="12" fill="hsl(var(--foreground))">
            Path Shade
          </text>
          <rect x="0" y="10" width="130" height="9" rx="4.5" fill="url(#shadeLegendGrad)" />
          <text x="0" y="29" fontSize="10" fill="hsl(var(--muted-foreground))">0% (Sun)</text>
          <text x="100" y="29" fontSize="10" fill="hsl(var(--muted-foreground))">100% (Lush)</text>

          <g transform="translate(160, 16)">
            <text x="0" y="0" fontSize="12" fill="hsl(var(--foreground))">💧 Water</text>
            <text x="75" y="0" fontSize="12" fill="hsl(var(--foreground))">🪑 Rest</text>
            <text x="140" y="0" fontSize="12" fill="#10b981" fontWeight="bold">━ Active</text>
            <text x="215" y="0" fontSize="12" fill="hsl(var(--muted-foreground))">┄ Prior</text>
          </g>
        </g>
      </svg>

      {/* Hover Inspection HUD Tooltip */}
      {(hoveredNode || hoveredEdge) && (
        <div className="absolute bottom-4 right-4 z-30 max-w-xs bg-card/95 backdrop-blur-xl border border-border/80 rounded-xl p-3.5 shadow-lg text-xs space-y-1.5 transition-all">
          {hoveredNode && (
            <>
              <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-primary" />
                {hoveredNode.name}
              </div>
              <div className="text-muted-foreground">
                {hoveredNode.water && "💧 Water refill station active."}
                {hoveredNode.rest && " 🪑 Shaded seating available."}
                {!hoveredNode.water && !hoveredNode.rest && "Campus path intersection."}
              </div>
              {hoveredNode.sponsor_goal_inr > 0 && (
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                  ₹{hoveredNode.raised_inr} raised of ₹{hoveredNode.sponsor_goal_inr} goal
                </div>
              )}
            </>
          )}

          {hoveredEdge && (
            <>
              <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-500" />
                Path Segment: {hoveredEdge.id}
              </div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
                <div>Length: <strong>{hoveredEdge.length_m} m</strong></div>
                <div>Shade: <strong>{Math.round(hoveredEdge.shade * 100)}%</strong></div>
              </div>
              <div className="text-muted-foreground pt-0.5">
                {surfaceLabel(hoveredEdge.surface)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
