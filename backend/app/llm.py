"""Explanation layer.

The heat score is computed by engine.py. The LLM never invents numbers: it is
handed the computed facts and asked only to narrate the trade-off. Order of
attempts: Claude -> Gemini -> deterministic template (always works offline).
"""
from __future__ import annotations

import json

from . import config

SYSTEM = (
    "You are the explanation layer of CoolRoute, a heat-aware walking route planner. "
    "You are given computed facts as JSON. Explain in 3-5 plain sentences why the "
    "recommended route is better or worse than the fastest route, naming the time "
    "cost and heat saving, and which factors drove it (shade, surface, sun, humidity, "
    "water/rest stops). Use ONLY numbers present in the JSON. Do not give medical advice. "
    "If a rerouting is described, say what changed and why the route changed or did not."
)


def _facts(payload: dict) -> str:
    return json.dumps(payload, separators=(",", ":"))[:6000]


def _claude(payload: dict) -> str | None:
    if not config.ANTHROPIC_API_KEY:
        return None
    import httpx

    r = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": config.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": config.ANTHROPIC_MODEL,
            "max_tokens": 400,
            "system": SYSTEM,
            "messages": [{"role": "user", "content": _facts(payload)}],
        },
        timeout=20,
    )
    r.raise_for_status()
    return "".join(b.get("text", "") for b in r.json().get("content", [])).strip() or None


def _gemini(payload: dict) -> str | None:
    if not config.GEMINI_API_KEY:
        return None
    import httpx

    r = httpx.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{config.GEMINI_MODEL}:generateContent",
        headers={"x-goog-api-key": config.GEMINI_API_KEY, "content-type": "application/json"},
        json={
            "systemInstruction": {"parts": [{"text": SYSTEM}]},
            "contents": [{"role": "user", "parts": [{"text": _facts(payload)}]}],
            "generationConfig": {"maxOutputTokens": 400, "temperature": 0.3},
        },
        timeout=20,
    )
    r.raise_for_status()
    parts = r.json()["candidates"][0]["content"]["parts"]
    return "".join(p.get("text", "") for p in parts).strip() or None


def _template(payload: dict) -> str:
    fast, rec = payload.get("fastest"), payload.get("recommended")
    if not fast or not rec:
        return "No route is available under these conditions."
    cond = payload.get("conditions", {})
    lines = []
    if fast["path"] == rec["path"]:
        lines.append(
            f"The fastest route ({fast['minutes']} min) is also the best choice right now: "
            f"no detour reduces heat enough to be worth the extra time."
        )
    else:
        lines.append(
            f"The recommended route takes {rec['extra_minutes_vs_fastest']} extra minutes "
            f"({rec['minutes']} vs {fast['minutes']} min) but cuts heat exposure by "
            f"{rec['heat_saved_pct']}% ({rec['heat']} vs {fast['heat']} heat units)."
        )
        lines.append(
            f"It is {rec['shade_pct']}% shaded versus {fast['shade_pct']}% on the fastest route"
            f" and passes {rec['water_stops']} water point(s) instead of {fast['water_stops']}."
        )
    lines.append(
        f"At {cond.get('hour')}:00 it feels like {cond.get('apparent_temp_c')} C "
        f"with {cond.get('solar_w_m2')} W/m2 of sun, so shade and water stops carry real weight."
    )
    rr = payload.get("reroute")
    if rr:
        lines.append(
            ("The route changed: " if rr["route_changed"] else "The route stayed the same: ")
            + " ".join(rr.get("reasons", []))
        )
        cmp_ = rr.get("comparison")
        if rr["route_changed"] and cmp_:
            lines.append(
                f"Under the new conditions the old route would cost {cmp_['old_heat']} heat units "
                f"in {cmp_['old_minutes']} min; the new one costs {cmp_['new_heat']} in {cmp_['new_minutes']} min."
            )
        elif rr["route_changed"] and rr.get("previous_route_still_valid") is False:
            lines.append("The previous route is no longer passable, so it was replaced.")
    return " ".join(lines)


def explain(payload: dict) -> dict:
    for name, fn in (("claude", _claude), ("gemini", _gemini)):
        try:
            text = fn(payload)
            if text:
                return {"text": text, "source": name}
        except Exception:  # network, quota, bad key -> fall through to next provider
            continue
    return {"text": _template(payload), "source": "template"}
