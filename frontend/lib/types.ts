export type Node = {
  id: string;
  name: string;
  x: number;
  y: number;
  water: boolean;
  rest: boolean;
  sponsor_goal_inr: number;
  raised_inr: number;
};

export type Edge = {
  id: string;
  a: string;
  b: string;
  length_m: number;
  shade: number;
  surface: "asphalt" | "concrete" | "brick" | "grass";
};

export type Scenario = {
  temp_delta: number;
  humidity_delta: number;
  solar_scale: number;
  closed_edges: string[];
  disabled_points: string[];
  label: string;
};

export type Campus = {
  name: string;
  nodes: Node[];
  edges: Edge[];
  weather: { hour: number; t: number; rh: number; ws: number; sw: number }[];
  presets: Record<string, Scenario>;
  formula: Record<string, string>;
  data_note: string;
};

export type Segment = {
  edge_id: string;
  length_m: number;
  shade: number;
  surface: string;
  minutes: number;
  sun_load: number;
  stress_per_min: number;
  heat: number;
};

export type Relief = { kind: "water" | "rest"; node: string; name: string; credit: number };

export type Route = {
  path: string[];
  segments: Segment[];
  reliefs: Relief[];
  labels: ("fastest" | "balanced" | "coolest")[];
  distance_m: number;
  minutes: number;
  gross_heat: number;
  relief_credit: number;
  heat: number;
  avg_stress: number;
  risk: "low" | "moderate" | "high" | "extreme";
  shade_pct: number;
  water_stops: number;
  rest_stops: number;
  extra_minutes_vs_fastest: number;
  heat_saved_vs_fastest: number;
  heat_saved_pct: number;
};

export type Conditions = {
  hour: number;
  temp_c: number;
  humidity_pct: number;
  wind_ms: number;
  solar_w_m2: number;
  apparent_temp_c: number;
  excess: number;
};

export type Explanation = { text: string; source: "claude" | "gemini" | "template" };

export type PlanResult = {
  reachable: boolean;
  scenario: string;
  conditions: Conditions;
  alternatives_considered?: number;
  routes: Route[];
  recommended?: string[];
  explanation?: Explanation;
};

export type RerouteResult = {
  before: PlanResult;
  after: PlanResult;
  route_changed: boolean;
  previous_route_still_valid?: boolean;
  previous_route_under_new_conditions?: Route | null;
  comparison?: {
    old_minutes: number;
    old_heat: number;
    new_minutes: number;
    new_heat: number;
    minutes_saved: number;
    heat_saved: number;
  } | null;
  reasons: string[];
  explanation?: Explanation;
};

export type SponsorOrder = {
  order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string | null;
  mock: boolean;
  point_name: string;
};
