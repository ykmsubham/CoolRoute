import type { Campus, PlanResult, RerouteResult, Scenario, SponsorOrder } from "./types";

export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (typeof j.detail === "string") msg = j.detail;
    } catch {
      /* keep default message */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const getCampus = () => call<Campus>("/api/campus");

export const planRoutes = (origin: string, dest: string, hour: number) =>
  call<PlanResult>("/api/routes", { origin, dest, hour });

export const rerouteFor = (origin: string, dest: string, hour: number, change: Scenario) =>
  call<RerouteResult>("/api/reroute", { origin, dest, hour, change });

export const createSponsorOrder = (point_id: string, amount_inr: number, donor_name: string) =>
  call<SponsorOrder>("/api/sponsor/order", { point_id, amount_inr, donor_name });

export const verifySponsor = (order_id: string, payment_id: string, signature: string) =>
  call<{ status: string; mock?: boolean }>("/api/sponsor/verify", { order_id, payment_id, signature });
