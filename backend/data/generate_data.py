"""Generate the offline data used by CoolRoute.

Produces, next to this file:
  weather_sample.csv  - 24 hourly rows in the NASA POWER column format
                        (T2M, RH2M, WS2M, ALLSKY_SFC_SW_DWN). Synthetic,
                        seeded, hot-humid day (Odisha pre-monsoon pattern).
                        Swap in a real NASA POWER hourly CSV with the same
                        columns and nothing else needs to change.
  campus.json         - synthetic campus graph: nodes (with water / rest
                        points), edges (length, shade, surface).

Run:  python data/generate_data.py
"""
import csv
import json
import math
import random
from pathlib import Path

HERE = Path(__file__).parent
random.seed(42)

# ---------------------------------------------------------------- weather
def weather_rows():
    rows = []
    for hour in range(24):
        # Temperature: min ~27C at 05:00, max ~38C at 14:00
        t = 32.5 + 5.5 * math.sin((hour - 8.5) / 24 * 2 * math.pi)
        t += random.uniform(-0.3, 0.3)
        # Humidity inversely follows temperature
        rh = 68 - 22 * math.sin((hour - 8.5) / 24 * 2 * math.pi)
        rh += random.uniform(-2, 2)
        # Shortwave radiation: daylight 06-18, peak ~ 950 W/m2 at noon
        if 6 <= hour <= 18:
            sw = 950 * math.sin((hour - 6) / 12 * math.pi) ** 1.2
            sw *= random.uniform(0.95, 1.0)
        else:
            sw = 0.0
        ws = 1.8 + 1.2 * math.sin((hour - 6) / 24 * 2 * math.pi) + random.uniform(-0.2, 0.2)
        rows.append(
            {
                "HOUR": hour,
                "T2M": round(t, 1),
                "RH2M": round(max(25, min(95, rh)), 1),
                "WS2M": round(max(0.3, ws), 1),
                "ALLSKY_SFC_SW_DWN": round(sw, 1),
            }
        )
    return rows


# ----------------------------------------------------------------- campus
# x, y are map coordinates (0-1000 x 0-640); length is derived from them.
NODES = [
    # id, name, x, y, water, rest
    ("GATE", "Main Gate", 60, 320, False, False),
    ("J1", "Gate Junction", 170, 320, False, False),
    ("ADMIN", "Admin Block", 270, 190, True, False),
    ("LIB", "Library", 270, 450, True, False),
    ("J2", "North Junction", 410, 190, False, False),
    ("J3", "South Junction", 410, 450, False, False),
    ("LAB", "Science Lab", 530, 90, True, False),
    ("CANT", "Canteen", 510, 320, True, True),
    ("PARK", "Banyan Park", 510, 560, False, True),
    ("J4", "East Junction", 650, 190, False, False),
    ("J5", "South-East Junction", 650, 450, False, False),
    ("AUD", "Auditorium", 760, 310, False, True),
    ("SPORT", "Sports Ground", 790, 540, False, False),
    ("HOS", "Hostel Block", 910, 110, True, False),
]

# a, b, shade (0 = full sun, 1 = full canopy), surface
EDGES = [
    ("GATE", "J1", 0.10, "asphalt"),
    ("J1", "ADMIN", 0.45, "concrete"),
    ("J1", "LIB", 0.70, "brick"),
    ("J1", "CANT", 0.00, "asphalt"),  # main road: short, fully exposed
    ("ADMIN", "J2", 0.20, "asphalt"),
    ("LIB", "J3", 0.80, "grass"),
    ("J2", "LAB", 0.60, "concrete"),
    ("J2", "CANT", 0.40, "concrete"),
    ("J3", "CANT", 0.75, "brick"),
    ("J3", "PARK", 0.90, "grass"),
    ("CANT", "AUD", 0.15, "asphalt"),
    ("CANT", "J5", 0.30, "concrete"),
    ("LAB", "J4", 0.30, "concrete"),
    ("J4", "AUD", 0.40, "concrete"),
    ("J4", "HOS", 0.20, "asphalt"),
    ("AUD", "HOS", 0.10, "asphalt"),
    ("AUD", "SPORT", 0.20, "asphalt"),
    ("PARK", "J5", 0.85, "grass"),
    ("J5", "AUD", 0.50, "concrete"),
    ("J5", "SPORT", 0.20, "asphalt"),
]

METRES_PER_UNIT = 0.9


def campus():
    coords = {n[0]: (n[2], n[3]) for n in NODES}
    nodes = [
        {
            "id": i,
            "name": name,
            "x": x,
            "y": y,
            "water": water,
            "rest": rest,
            "sponsor_goal_inr": 2500 if water else 0,
        }
        for i, name, x, y, water, rest in NODES
    ]
    edges = []
    for a, b, shade, surface in EDGES:
        (x1, y1), (x2, y2) = coords[a], coords[b]
        length = round(math.hypot(x2 - x1, y2 - y1) * METRES_PER_UNIT)
        edges.append(
            {
                "id": f"{a}-{b}",
                "a": a,
                "b": b,
                "length_m": length,
                "shade": shade,
                "surface": surface,
            }
        )
    return {"name": "Demo Campus Zone (synthetic)", "nodes": nodes, "edges": edges}


if __name__ == "__main__":
    rows = weather_rows()
    with open(HERE / "weather_sample.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    with open(HERE / "campus.json", "w") as f:
        json.dump(campus(), f, indent=2)
    print("wrote weather_sample.csv and campus.json")
