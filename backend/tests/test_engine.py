import hashlib
import hmac
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

from app import config, engine as eng, llm, payments

CAMPUS = eng.load_campus()
WEATHER = eng.load_weather()
BASE = eng.PRESETS["baseline"]


def plan(sc=BASE, o="GATE", d="HOS", hour=13):
    return eng.plan(CAMPUS, WEATHER, o, d, hour, sc)


def test_data_loaded():
    assert len(WEATHER) == 24
    assert len(CAMPUS["nodes"]) >= 10 and len(CAMPUS["edges"]) >= 15
    assert any(n["water"] for n in CAMPUS["nodes"]) and any(n["rest"] for n in CAMPUS["nodes"])


def test_at_least_two_routes_compared():
    res = plan()
    assert res["reachable"] and len(res["routes"]) >= 2


def test_fastest_is_fastest_and_coolest_is_coolest():
    res = plan()
    fastest = next(r for r in res["routes"] if "fastest" in r["labels"])
    coolest = next(r for r in res["routes"] if "coolest" in r["labels"])
    assert all(fastest["minutes"] <= r["minutes"] + 1e-9 for r in res["routes"])
    assert all(coolest["heat"] <= r["heat"] + 1e-9 for r in res["routes"])
    assert coolest["heat"] < fastest["heat"]  # trade-off exists at midday
    assert coolest["minutes"] >= fastest["minutes"]


def test_score_is_reproducible_by_hand():
    res = plan()
    r = res["routes"][0]
    cond = res["conditions"]
    gross = sum(
        (e["length_m"] / 80.0)
        * (1 + cond["excess"] + 1.5 * (cond["solar_w_m2"] / 1000) * (1 - e["shade"])
           + 0.6 * (cond["solar_w_m2"] / 1000) * (1 - e["shade"]) * eng.SURFACE_FACTOR[e["surface"]])
        for e in (next(x for x in CAMPUS["edges"] if x["id"] == s["edge_id"]) for s in r["segments"])
    )
    assert abs(r["gross_heat"] - gross) < 0.15
    assert r["heat"] <= r["gross_heat"]
    assert r["relief_credit"] <= eng.RELIEF_CAP * r["gross_heat"] + 0.11


def test_night_is_cooler_than_midday():
    assert plan(hour=2)["routes"][0]["heat"] < plan(hour=13)["routes"][0]["heat"]


def test_heatwave_raises_heat():
    hot = plan(eng.PRESETS["heatwave"])["routes"][0]["heat"]
    assert hot > plan()["routes"][0]["heat"]


def test_cloud_cover_reduces_value_of_shade():
    sunny = plan()
    cloudy = plan(eng.PRESETS["cloud_cover"])
    gap = lambda res: (next(r for r in res["routes"] if "fastest" in r["labels"])["heat"]
                       - next(r for r in res["routes"] if "coolest" in r["labels"])["heat"])
    assert gap(cloudy) < gap(sunny)


def test_closed_edge_never_used():
    sc = eng.PRESETS["road_closed"]
    assert sc.closed_edges
    for r in plan(sc)["routes"]:
        used = [s["edge_id"] for s in r["segments"]]
        assert not set(sc.closed_edges) & set(used)


def test_water_outage_changes_recommendation():
    out = eng.reroute(CAMPUS, WEATHER, "GATE", "HOS", 13, BASE, eng.PRESETS["water_outage"])
    assert out["route_changed"] is True and out["reasons"]
    c = out["comparison"]
    assert c["heat_saved"] > 0  # leaving the dry route really is cooler


def test_cloud_cover_reroutes_to_the_quicker_road():
    out = eng.reroute(CAMPUS, WEATHER, "GATE", "HOS", 13, BASE, eng.PRESETS["cloud_cover"])
    assert out["route_changed"] is True
    assert out["comparison"]["minutes_saved"] > 0  # shade detour no longer pays off


def test_closed_path_forces_reroute():
    out = eng.reroute(CAMPUS, WEATHER, "GATE", "HOS", 13, BASE, eng.PRESETS["road_closed"])
    assert out["route_changed"] is True
    assert out["previous_route_still_valid"] is False and out["comparison"] is None


def test_heatwave_raises_score_but_may_keep_route():
    out = eng.reroute(CAMPUS, WEATHER, "GATE", "HOS", 13, BASE, eng.PRESETS["heatwave"])
    assert out["route_changed"] is False
    assert out["comparison"]["heat_saved"] == 0.0
    assert out["comparison"]["old_heat"] > next(
        r for r in out["before"]["routes"] if r["path"] == out["before"]["recommended"])["heat"]


def test_unreachable_when_all_paths_cut():
    cut = eng.Scenario(closed_edges=["J4-HOS", "AUD-HOS"], label="cut")
    res = plan(cut)
    assert res["reachable"] is False and res["routes"] == []


def test_bad_input():
    with pytest.raises(ValueError):
        eng.plan(CAMPUS, WEATHER, "GATE", "GATE", 12, BASE)
    with pytest.raises(ValueError):
        eng.plan(CAMPUS, WEATHER, "GATE", "NOPE", 12, BASE)


def test_template_explanation_without_keys(monkeypatch):
    monkeypatch.setattr(config, "ANTHROPIC_API_KEY", "")
    monkeypatch.setattr(config, "GEMINI_API_KEY", "")
    res = plan()
    fastest = next(r for r in res["routes"] if "fastest" in r["labels"])
    rec = next(r for r in res["routes"] if r["path"] == res["recommended"])
    out = llm.explain({"conditions": res["conditions"], "fastest": fastest, "recommended": rec})
    assert out["source"] == "template" and str(rec["heat_saved_pct"]) in out["text"]


def test_razorpay_signature(monkeypatch):
    monkeypatch.setattr(config, "RAZORPAY_KEY_ID", "rzp_test_x")
    monkeypatch.setattr(config, "RAZORPAY_KEY_SECRET", "secret")
    good = hmac.new(b"secret", b"order_1|pay_1", hashlib.sha256).hexdigest()
    assert payments.verify_signature("order_1", "pay_1", good)
    assert not payments.verify_signature("order_1", "pay_1", "0" * 64)
    assert not payments.verify_signature("order_2", "pay_1", good)


def test_mock_payment_mode(monkeypatch):
    monkeypatch.setattr(config, "RAZORPAY_KEY_ID", "")
    monkeypatch.setattr(config, "RAZORPAY_KEY_SECRET", "")
    o = payments.create_order(100, "r")
    assert o["mock"] and o["amount"] == 10000
    assert payments.verify_signature(o["id"], "pay_mock_1", "")
    assert not payments.verify_signature(o["id"], "pay_real_1", "")
