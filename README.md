# CoolRoute: heat-aware routing (T1 Climate & Disaster Resilience, PS-01)

Recommends walking routes that cut heat exposure, and shows the trade-off against travel time.
Demo zone: a synthetic 14-location campus. Every route is scored with an open, explainable heat score.

## Deliverables map

| Deliverable | Where |
|---|---|
| 1. Working prototype for one campus zone | `backend/` (FastAPI) + `frontend/` (Next.js) |
| 2. Compare 2+ routes with an open heat score | Fastest / Recommended / Coolest cards; formula in `backend/app/engine.py` and shown in the UI |
| 3. Map of shade and water points | SVG campus map: edge colour = shade, 💧 water, 🪑 rest |
| 4. Rerouting when a simulated condition changes | "Change the conditions" panel -> `/api/reroute`, old route shown dotted |

## Stack

| Layer | Used | Notes |
|---|---|---|
| ML / explanation | **Claude** (primary) -> **Gemini** (fallback) -> built-in template | They only *narrate* numbers the engine computed; they never produce the score |
| Backend | **FastAPI** | |
| Database | **PostgreSQL** (SQLite fallback if `DATABASE_URL` unset) | sponsorships + route query log |
| Frontend | **Next.js 14** + React | |
| Payment | **Razorpay** | water/rest point sponsorship, server-side signature check; mock mode without keys |

Not used: Node.js backend and MongoDB. Your list offered each as an alternative to FastAPI / PostgreSQL, so I picked one of each pair.

## The heat score (transparent by design)

```
minutes   = length_m / 80
AT        = Steadman apparent temperature from T2M, RH2M, WS2M
excess    = max(0, AT - 26) / 10
sun       = (solar W/m2 / 1000) * (1 - shade)
stress    = 1 + excess + 1.5*sun + 0.6*sun*surface_factor     (per minute)
edge_heat = minutes * stress
relief    = water stop 1.2*(1+excess), rest stop 0.6*(1+excess)
route_heat = sum(edge_heat) - min(sum(relief), 35% of sum(edge_heat))
```

Surface factors: asphalt 1.0, concrete 0.8, brick 0.6, grass 0.2.
The route search enumerates **all** simple paths (graph is small), so "coolest" and "fastest" are exact, not heuristic.
**Recommended** minimises an equal blend of normalised time and heat, limited to <= 1.6x the fastest time.

The weights (1.5, 0.6, relief units, 35% cap) are modelling choices for this prototype, not calibrated against physiological data. They are all in one place at the top of `engine.py`.

## Data

- `backend/data/weather_sample.csv`: 24 hourly rows in **NASA POWER column format** (`T2M, RH2M, WS2M, ALLSKY_SFC_SW_DWN`). **It is generated synthetic data** (seeded diurnal curve), not a real NASA download. To use real data, export an hourly POWER CSV for one day with those four columns plus an `HOUR` column and replace the file.
- `backend/data/campus.json`: synthetic nodes, edges (length, shade, surface), water and rest points.
- Regenerate both: `python backend/data/generate_data.py`

## Run it

```bash
# 1. Backend
cd backend
cp .env.example .env            # add keys if you have them; all optional
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://localhost:8000/docs

# 2. Frontend
cd ../frontend
cp .env.local.example .env.local
npm install
npm run dev                     # http://localhost:3000
```

Or with Postgres: `cp backend/.env.example backend/.env && docker compose up --build`.

Everything works with **no API keys**: explanations use the built-in template and payments use mock mode.

## Demo script (about 2 minutes)

1. Gate -> Hostel at 13:00. Fastest road is mostly in full sun; the Recommended route takes ~0.5 min longer for a visibly lower heat score. Open "How this heat score is calculated" and walk one segment.
2. Slide time to 21:00: the trade-off almost disappears, so the app recommends the fast road.
3. Click **☁️ Cloud cover**: shade stops mattering, route switches back to the quick road, old route shown dotted.
4. Click **🚱 Water points offline**: route switches again; the banner shows old-vs-new heat.
5. Click **🚧 Path closed**: previous route is impassable and gets replaced.
6. **🔥 Heatwave**: scores rise but the route holds. The app says so rather than inventing a change.
7. Tap a 💧 marker -> sponsor it with Razorpay.

## Razorpay

Set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (test keys, `rzp_test_...`). Flow: `POST /api/sponsor/order` creates an order -> Checkout opens -> `POST /api/sponsor/verify` checks `HMAC_SHA256(order_id|payment_id)` with the secret before marking it paid. Without keys, mock orders are recorded with `mock=1`.

## API

`GET /api/health` · `GET /api/campus` · `POST /api/routes` · `POST /api/reroute` · `POST /api/sponsor/order` · `POST /api/sponsor/verify`. Interactive docs at `/docs`.

## Tests

`cd backend && python -m pytest -q tests`: 17 tests covering scoring (including a by-hand recomputation), route optimality, every rerouting scenario, the template explainer and Razorpay signature checks.

## Limits

- One synthetic zone; shade is a static per-path value (no sun-angle model).
- Heat score is a transparent heuristic, not a medical exposure model. It is not health advice.
- Unauthenticated demo API; add auth and rate limiting before any real deployment.
