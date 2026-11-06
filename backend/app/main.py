from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import config, engine as eng, llm, payments
from .db import RouteQuery, Sponsorship, get_session, init_db, raised_by_point

CAMPUS = eng.load_campus()
WEATHER = eng.load_weather()
NODE_IDS = {n["id"] for n in CAMPUS["nodes"]}


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="CoolRoute API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------- schemas
class ScenarioIn(BaseModel):
    temp_delta: float = Field(0.0, ge=-15, le=15)
    humidity_delta: float = Field(0.0, ge=-60, le=60)
    solar_scale: float = Field(1.0, ge=0, le=1.2)
    closed_edges: list[str] = []
    disabled_points: list[str] = []
    label: str = "Custom"


class PlanIn(BaseModel):
    origin: str
    dest: str
    hour: int = Field(13, ge=0, le=23)
    scenario: ScenarioIn | None = None
    explain: bool = True


class RerouteIn(BaseModel):
    origin: str
    dest: str
    hour: int = Field(13, ge=0, le=23)
    baseline: ScenarioIn | None = None
    change: ScenarioIn
    explain: bool = True


class SponsorOrderIn(BaseModel):
    point_id: str
    amount_inr: int = Field(ge=10, le=100000)
    donor_name: str = Field("", max_length=80)


class SponsorVerifyIn(BaseModel):
    order_id: str
    payment_id: str
    signature: str = ""


# ------------------------------------------------------------------ helpers
def _check_nodes(*ids: str):
    for i in ids:
        if i not in NODE_IDS:
            raise HTTPException(422, f"Unknown location '{i}'")


def _explain_payload(result: dict, reroute: dict | None = None) -> dict:
    routes = result["routes"]
    fastest = next((r for r in routes if "fastest" in r["labels"]), None)
    rec = next((r for r in routes if r["path"] == result.get("recommended")), None)
    slim = lambda r: r and {k: r[k] for k in (
        "path", "minutes", "heat", "avg_stress", "risk", "shade_pct", "water_stops",
        "rest_stops", "extra_minutes_vs_fastest", "heat_saved_pct")}
    out = {"conditions": result["conditions"], "fastest": slim(fastest), "recommended": slim(rec)}
    if reroute:
        out["reroute"] = {"route_changed": reroute["route_changed"], "reasons": reroute["reasons"],
                          "comparison": reroute.get("comparison"),
                          "previous_route_still_valid": reroute.get("previous_route_still_valid")}
    return out


def _log(session: Session, origin, dest, hour, result, label):
    try:
        session.add(RouteQuery(origin=origin, dest=dest, hour=hour, scenario=label,
                               recommended="->".join(result.get("recommended", []))[:200]))
        session.commit()
    except Exception:
        session.rollback()


# ----------------------------------------------------------------- routes
@app.get("/api/health")
def health():
    return {
        "ok": True,
        "llm": {"claude": bool(config.ANTHROPIC_API_KEY), "gemini": bool(config.GEMINI_API_KEY)},
        "razorpay_live": payments.is_live(),
    }


@app.get("/api/campus")
def campus(session: Session = Depends(get_session)):
    raised = raised_by_point(session)
    nodes = [{**n, "raised_inr": raised.get(n["id"], 0)} for n in CAMPUS["nodes"]]
    return {
        "name": CAMPUS["name"],
        "nodes": nodes,
        "edges": CAMPUS["edges"],
        "weather": [{"hour": h, **w} for h, w in sorted(WEATHER.items())],
        "presets": {k: {"temp_delta": s.temp_delta, "humidity_delta": s.humidity_delta,
                        "solar_scale": s.solar_scale, "closed_edges": s.closed_edges,
                        "disabled_points": s.disabled_points, "label": s.label}
                    for k, s in eng.PRESETS.items()},
        "formula": eng.SCORE_FORMULA,
        "data_note": "Weather is a synthetic NASA POWER-format sample; shade, surfaces and "
                     "water points are synthetic demo data.",
    }


@app.post("/api/routes")
def routes(body: PlanIn, session: Session = Depends(get_session)):
    _check_nodes(body.origin, body.dest)
    sc = eng.Scenario.from_dict(body.scenario.model_dump() if body.scenario else None)
    try:
        result = eng.plan(CAMPUS, WEATHER, body.origin, body.dest, body.hour, sc)
    except ValueError as e:
        raise HTTPException(422, str(e))
    if result["reachable"] and body.explain:
        result["explanation"] = llm.explain(_explain_payload(result))
    _log(session, body.origin, body.dest, body.hour, result, sc.label)
    return result


@app.post("/api/reroute")
def reroute(body: RerouteIn, session: Session = Depends(get_session)):
    _check_nodes(body.origin, body.dest)
    base = eng.Scenario.from_dict(body.baseline.model_dump() if body.baseline else None)
    change = eng.Scenario.from_dict(body.change.model_dump())
    try:
        result = eng.reroute(CAMPUS, WEATHER, body.origin, body.dest, body.hour, base, change)
    except ValueError as e:
        raise HTTPException(422, str(e))
    if result["after"].get("reachable") and body.explain:
        result["explanation"] = llm.explain(_explain_payload(result["after"], result))
    _log(session, body.origin, body.dest, body.hour, result["after"], change.label)
    return result


# --------------------------------------------------------------- sponsorship
@app.post("/api/sponsor/order")
def sponsor_order(body: SponsorOrderIn, session: Session = Depends(get_session)):
    point = next((n for n in CAMPUS["nodes"] if n["id"] == body.point_id), None)
    if not point or not (point["water"] or point["rest"]):
        raise HTTPException(422, "That location has no water or rest point to sponsor")
    try:
        order = payments.create_order(body.amount_inr, f"cr_{body.point_id}")
    except Exception:
        raise HTTPException(502, "Could not create payment order. Try again.")
    session.add(Sponsorship(point_id=body.point_id, amount_inr=body.amount_inr,
                            donor_name=body.donor_name.strip(), order_id=order["id"],
                            status="created", mock=int(order["mock"])))
    session.commit()
    return {
        "order_id": order["id"],
        "amount_paise": order["amount"],
        "currency": "INR",
        "key_id": config.RAZORPAY_KEY_ID or None,
        "mock": order["mock"],
        "point_name": point["name"],
    }


@app.post("/api/sponsor/verify")
def sponsor_verify(body: SponsorVerifyIn, session: Session = Depends(get_session)):
    rec = session.scalar(select(Sponsorship).where(Sponsorship.order_id == body.order_id))
    if not rec:
        raise HTTPException(404, "Unknown order")
    if rec.status == "paid":
        return {"status": "paid", "already": True}
    if not payments.verify_signature(body.order_id, body.payment_id, body.signature):
        rec.status = "failed"
        session.commit()
        raise HTTPException(400, "Payment signature could not be verified")
    rec.status, rec.payment_id = "paid", body.payment_id
    session.commit()
    return {"status": "paid", "point_id": rec.point_id, "amount_inr": rec.amount_inr,
            "mock": bool(rec.mock)}
