"""CoolRoute core: transparent heat score + route search + rerouting.

Everything here is deterministic and explainable. No ML is involved in the
score itself; the LLM only *narrates* numbers computed here.

HEAT SCORE (per edge)
---------------------
    minutes   = length_m / WALK_SPEED_M_PER_MIN
    AT        = apparent temperature (Steadman, shade, from T2M / RH2M / WS2M)
    excess    = max(0, AT - 26) / 10                     # air-heat load
    sun       = (ALLSKY_SFC_SW_DWN / 1000) * (1 - shade) # direct-sun load, 0..1
    stress    = 1 + excess + 1.5*sun + 0.6*sun*surface_factor   # per minute
    edge_heat = minutes * stress

WATER / REST RELIEF (per stop on the route, start node excluded)
    credit = units * (1 + excess)       units: water = 1.2, rest = 0.6
    (a cooldown is worth more when the day is hotter)

ROUTE HEAT = sum(edge_heat) - min(sum(credits), 0.35 * sum(edge_heat))
Reported next to travel time. avg_stress = heat / minutes tells you how hard
each minute on the route "feels" compared with a mild-day baseline of 1.0.
"""
from __future__ import annotations

import csv
import json
import math
from copy import deepcopy
from dataclasses import dataclass, field
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

WALK_SPEED_M_PER_MIN = 80.0  # ~4.8 km/h
SURFACE_FACTOR = {"asphalt": 1.0, "concrete": 0.8, "brick": 0.6, "grass": 0.2}
WATER_UNITS = 1.2
REST_UNITS = 0.6
RELIEF_CAP = 0.35  # relief can offset at most 35% of gross heat

SCORE_FORMULA = {
    "minutes": "length_m / 80 m per min",
    "apparent_temp": "Steadman: T + 0.33*e - 0.70*wind - 4.0, e = RH/100 * 6.105 * exp(17.27*T/(237.7+T))",
    "excess": "max(0, AT - 26) / 10",
    "sun": "(solar_W_m2 / 1000) * (1 - shade)",
    "stress_per_min": "1 + excess + 1.5*sun + 0.6*sun*surface_factor",
    "edge_heat": "minutes * stress_per_min",
    "relief": "water stop 1.2 * (1 + excess), rest stop 0.6 * (1 + excess)",
    "route_heat": "sum(edge_heat) - min(sum(relief), 35% of sum(edge_heat))",
}


# ------------------------------------------------------------------ data
def load_weather(path: Path | None = None) -> dict[int, dict]:
    path = path or DATA_DIR / "weather_sample.csv"
    out = {}
    with open(path) as f:
        for row in csv.DictReader(f):
            out[int(row["HOUR"])] = {
                "t": float(row["T2M"]),
                "rh": float(row["RH2M"]),
                "ws": float(row["WS2M"]),
                "sw": float(row["ALLSKY_SFC_SW_DWN"]),
            }
    return out


def load_campus(path: Path | None = None) -> dict:
    path = path or DATA_DIR / "campus.json"
    with open(path) as f:
        return json.load(f)


# -------------------------------------------------------------- scenario
@dataclass
class Scenario:
    """A simulated environmental condition. All fields neutral by default."""

    temp_delta: float = 0.0        # +4 = heatwave
    humidity_delta: float = 0.0    # percentage points
    solar_scale: float = 1.0       # 0.3 = heavy cloud, 1.0 = clear
    closed_edges: list[str] = field(default_factory=list)
    disabled_points: list[str] = field(default_factory=list)  # water/rest out of service
    label: str = "Baseline"

    @classmethod
    def from_dict(cls, d: dict | None) -> "Scenario":
        d = d or {}
        return cls(
            temp_delta=float(d.get("temp_delta", 0.0)),
            humidity_delta=float(d.get("humidity_delta", 0.0)),
            solar_scale=float(d.get("solar_scale", 1.0)),
            closed_edges=list(d.get("closed_edges", [])),
            disabled_points=list(d.get("disabled_points", [])),
            label=d.get("label", "Custom"),
        )


PRESETS = {
    "baseline": Scenario(label="Baseline"),
    "heatwave": Scenario(temp_delta=4.0, humidity_delta=8.0, label="Heatwave (+4 C, +8% RH)"),
    "cloud_cover": Scenario(solar_scale=0.25, temp_delta=-2.0, label="Heavy cloud cover"),
    "water_outage": Scenario(disabled_points=["ADMIN", "LAB"], label="Admin + Lab water points offline"),
    "road_closed": Scenario(closed_edges=["J2-LAB"], label="Lab path closed (construction)"),
}


# --------------------------------------------------------------- physics
def apparent_temperature(t: float, rh: float, ws: float) -> float:
    e = (rh / 100.0) * 6.105 * math.exp(17.27 * t / (237.7 + t))
    return t + 0.33 * e - 0.70 * ws - 4.0


def conditions(weather: dict[int, dict], hour: int, sc: Scenario) -> dict:
    w = weather[hour % 24]
    t = w["t"] + sc.temp_delta
    rh = max(5.0, min(100.0, w["rh"] + sc.humidity_delta))
    sw = max(0.0, w["sw"] * sc.solar_scale)
    at = apparent_temperature(t, rh, w["ws"])
    return {
        "hour": hour % 24,
        "temp_c": round(t, 1),
        "humidity_pct": round(rh, 1),
        "wind_ms": w["ws"],
        "solar_w_m2": round(sw, 1),
        "apparent_temp_c": round(at, 1),
        "excess": round(max(0.0, at - 26.0) / 10.0, 3),
    }


def edge_cost(edge: dict, cond: dict) -> dict:
    minutes = edge["length_m"] / WALK_SPEED_M_PER_MIN
    sun = (cond["solar_w_m2"] / 1000.0) * (1.0 - edge["shade"])
    surf = SURFACE_FACTOR[edge["surface"]]
    stress = 1.0 + cond["excess"] + 1.5 * sun + 0.6 * sun * surf
    return {
        "edge_id": edge["id"],
        "length_m": edge["length_m"],
        "shade": edge["shade"],
        "surface": edge["surface"],
        "minutes": round(minutes, 2),
        "sun_load": round(sun, 3),
        "stress_per_min": round(stress, 3),
        "heat": round(minutes * stress, 2),
    }


def stop_relief(node: dict, cond: dict, disabled: set[str]) -> list[dict]:
    if node["id"] in disabled:
        return []
    out = []
    if node["water"]:
        out.append({"kind": "water", "node": node["id"], "name": node["name"],
                    "credit": round(WATER_UNITS * (1 + cond["excess"]), 2)})
    if node["rest"]:
        out.append({"kind": "rest", "node": node["id"], "name": node["name"],
                    "credit": round(REST_UNITS * (1 + cond["excess"]), 2)})
    return out


# --------------------------------------------------------------- routing
def build_adj(campus: dict, closed: set[str]) -> dict[str, list[tuple[str, dict]]]:
    adj: dict[str, list[tuple[str, dict]]] = {n["id"]: [] for n in campus["nodes"]}
    for e in campus["edges"]:
        if e["id"] in closed:
            continue
        adj[e["a"]].append((e["b"], e))
        adj[e["b"]].append((e["a"], e))
    return adj


def enumerate_paths(adj, src: str, dst: str, max_paths: int = 5000):
    """All simple paths (graph is small; exact search beats heuristics here)."""
    results = []
    stack = [(src, [src], [])]
    while stack and len(results) < max_paths:
        node, path, edges = stack.pop()
        if node == dst:
            results.append((path, edges))
            continue
        for nxt, e in adj[node]:
            if nxt not in path:
                stack.append((nxt, path + [nxt], edges + [e]))
    return results


def score_path(path, edges, nodes_by_id, cond, disabled: set[str]) -> dict:
    segs = [edge_cost(e, cond) for e in edges]
    reliefs = []
    for nid in path[1:]:
        reliefs += stop_relief(nodes_by_id[nid], cond, disabled)
    gross = sum(s["heat"] for s in segs)
    credit = min(sum(r["credit"] for r in reliefs), RELIEF_CAP * gross)
    minutes = sum(s["minutes"] for s in segs)
    heat = gross - credit
    dist = sum(s["length_m"] for s in segs)
    shaded = sum(s["length_m"] * s["shade"] for s in segs)
    return {
        "path": path,
        "segments": segs,
        "reliefs": reliefs,
        "distance_m": dist,
        "minutes": round(minutes, 1),
        "gross_heat": round(gross, 1),
        "relief_credit": round(credit, 1),
        "heat": round(heat, 1),
        "avg_stress": round(heat / minutes, 2) if minutes else 0.0,
        "shade_pct": round(100 * shaded / dist) if dist else 0,
        "water_stops": sum(1 for r in reliefs if r["kind"] == "water"),
        "rest_stops": sum(1 for r in reliefs if r["kind"] == "rest"),
    }


def risk_band(avg_stress: float) -> str:
    if avg_stress < 1.6:
        return "low"
    if avg_stress < 2.4:
        return "moderate"
    if avg_stress < 3.2:
        return "high"
    return "extreme"


def plan(campus: dict, weather: dict, origin: str, dest: str, hour: int, sc: Scenario) -> dict:
    nodes = {n["id"]: n for n in campus["nodes"]}
    if origin not in nodes or dest not in nodes:
        raise ValueError("unknown origin or destination")
    if origin == dest:
        raise ValueError("origin and destination are the same")

    cond = conditions(weather, hour, sc)
    adj = build_adj(campus, set(sc.closed_edges))
    disabled = set(sc.disabled_points)
    raw = enumerate_paths(adj, origin, dest)
    if not raw:
        return {"conditions": cond, "scenario": sc.label, "routes": [], "reachable": False}

    scored = [score_path(p, e, nodes, cond, disabled) for p, e in raw]
    fastest = min(scored, key=lambda r: (r["minutes"], r["heat"]))
    coolest = min(scored, key=lambda r: (r["heat"], r["minutes"]))

    # Balanced: cheapest in a normalised time+heat blend, capped to a sane detour.
    t0, h0 = fastest["minutes"], max(fastest["heat"], 1e-6)
    ok = [r for r in scored if r["minutes"] <= t0 * 1.6] or scored
    balanced = min(ok, key=lambda r: 0.5 * r["minutes"] / t0 + 0.5 * r["heat"] / h0)

    labelled: list[dict] = []
    seen: dict[tuple, dict] = {}
    for label, r in (("fastest", fastest), ("balanced", balanced), ("coolest", coolest)):
        key = tuple(r["path"])
        if key in seen:
            seen[key]["labels"].append(label)
            continue
        r = {**r, "labels": [label]}
        seen[key] = r
        labelled.append(r)

    for r in labelled:
        r["risk"] = risk_band(r["avg_stress"])
        r["extra_minutes_vs_fastest"] = round(r["minutes"] - fastest["minutes"], 1)
        r["heat_saved_vs_fastest"] = round(fastest["heat"] - r["heat"], 1)
        r["heat_saved_pct"] = (
            round(100 * (fastest["heat"] - r["heat"]) / fastest["heat"]) if fastest["heat"] else 0
        )

    return {
        "reachable": True,
        "scenario": sc.label,
        "conditions": cond,
        "alternatives_considered": len(scored),
        "routes": labelled,
        "recommended": next(r for r in labelled if "balanced" in r["labels"])["path"],
    }


def reroute(campus: dict, weather: dict, origin: str, dest: str, hour: int,
            baseline: Scenario, change: Scenario) -> dict:
    """Plan under both conditions and report exactly what changed and why."""
    before = plan(campus, weather, origin, dest, hour, baseline)
    after = plan(campus, weather, origin, dest, hour, change)
    if not before["reachable"] or not after["reachable"]:
        return {"before": before, "after": after, "route_changed": True,
                "reasons": ["No route available under one of the conditions."]}

    b_path, a_path = before["recommended"], after["recommended"]
    changed = b_path != a_path

    reasons = []
    bc, ac = before["conditions"], after["conditions"]
    if abs(ac["temp_c"] - bc["temp_c"]) >= 0.1:
        reasons.append(f"Temperature {bc['temp_c']} -> {ac['temp_c']} C "
                       f"(feels like {bc['apparent_temp_c']} -> {ac['apparent_temp_c']} C).")
    if abs(ac["solar_w_m2"] - bc["solar_w_m2"]) >= 1:
        reasons.append(f"Solar radiation {bc['solar_w_m2']} -> {ac['solar_w_m2']} W/m2, "
                       f"so shade matters {'less' if ac['solar_w_m2'] < bc['solar_w_m2'] else 'more'}.")
    if change.closed_edges:
        reasons.append("Closed paths: " + ", ".join(change.closed_edges) + ".")
    if change.disabled_points:
        reasons.append("Water/rest points offline: " + ", ".join(change.disabled_points) + ".")

    # Re-score the OLD route under the NEW conditions: what staying put would cost.
    nodes = {n["id"]: n for n in campus["nodes"]}
    cond = after["conditions"]
    adj = build_adj(campus, set(change.closed_edges))
    old_scored = None
    for p, e in enumerate_paths(adj, origin, dest):
        if p == b_path:
            old_scored = score_path(p, e, nodes, cond, set(change.disabled_points))
            break

    new_best = next(r for r in after["routes"] if r["path"] == a_path)
    comparison = None
    if old_scored is not None:
        comparison = {
            "old_minutes": old_scored["minutes"], "old_heat": old_scored["heat"],
            "new_minutes": new_best["minutes"], "new_heat": new_best["heat"],
            "minutes_saved": round(old_scored["minutes"] - new_best["minutes"], 1),
            "heat_saved": round(old_scored["heat"] - new_best["heat"], 1),
        }

    return {
        "before": before,
        "after": after,
        "route_changed": changed,
        "comparison": comparison,
        "previous_route_still_valid": old_scored is not None,
        "previous_route_under_new_conditions": old_scored,
        "reasons": reasons,
    }
