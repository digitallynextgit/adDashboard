/**
 * H2S fact aggregator.
 *
 * Pulls the last 7 days of data from every connected source table in Supabase,
 * rolls it up into one unified `H2sFacts` object that gets fed to the LLM.
 *
 * Returns a structured object — never throws on missing data; missing sources
 * become empty arrays / zero values with `available: false` flags.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ----- Types -----

export interface H2sFacts {
  generated_at: string;
  this_week:  { start: string; end: string };
  prev_week:  { start: string; end: string };

  headline: {
    revenue:        { current: number; prev: number; wow_pct: number | null };
    orders:         { current: number; prev: number; wow_pct: number | null };
    spend:          { current: number; prev: number; wow_pct: number | null };
    blended_cac:    { current: number; prev: number; wow_pct: number | null };
    blended_roas:   { current: number; prev: number; wow_pct: number | null };
    prepaid_pct:    { current: number; prev: number; wow_pct: number | null };
    rto_pct:        { current: number; prev: number; wow_pct: number | null };
  };

  by_state: Array<{
    state: string;
    orders: number;
    revenue: number;
    prepaid_count: number;
    rto_count: number;
    is_primary: boolean;
    wow_revenue_pct: number | null;
  }>;

  by_channel: Array<{
    channel: string;
    spend: number;
    revenue: number;
    orders: number;
    roas: number;
    revenue_share_pct: number;
  }>;

  by_quadrant: Array<{
    quadrant: string;
    quadrant_label: string;
    spend: number;
    revenue: number;
    impressions: number;
    clicks: number;
    ctr: number;
    roas: number;
    spend_share_pct: number;
    campaign_count: number;
  }>;

  cohorts: Array<{
    cohort: string;
    customer_count: number;
    total_revenue: number;
    reorder_count: number;
    replacement_rate_pct: number;
  }>;

  funnel: {
    sessions: number;
    add_to_cart: number;
    initiate_checkout: number;
    purchases: number;
    rage_clicks: number;
    dead_clicks: number;
    js_errors: number;
    available: { ga4: boolean; clarity: boolean; gokwik: boolean };
  };

  top_queries: {
    converting: Array<{ query: string; clicks: number; position: number }>;
    gaps:       Array<{ query: string; impressions: number; clicks: number; ctr: number }>;
    available: boolean;
  };

  anomalies: Array<{
    metric: string;
    magnitude: string;
    direction: "up" | "down";
    sigma: number;
    notes?: string;
  }>;

  prior_summaries: Array<{
    week_start: string;
    summary_excerpt: string;  // first ~500 chars of prior report
  }>;
}

const PRIMARY_STATES = ["TN", "GJ", "AP", "MH", "TG", "PY"];

const QUADRANT_LABELS: Record<string, string> = {
  hardwater_costs: "#HardWaterIsCostingYou",
  buy_smart:       "#BuySmartNotRepeatedly",
  real_people:     "#RealPeopleRealSoftWater",
  water_expert:    "#WaterExpertOfTheHouse",
};

// ----- Helpers -----

function db(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateMinus(d: Date, days: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() - days);
  return r;
}

function wowPct(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

function sum<T>(rows: T[], pick: (r: T) => number): number {
  return rows.reduce((a, r) => a + (pick(r) || 0), 0);
}

// ----- Sub-fetchers -----

interface CampaignMetricRow {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  purchases: number;
  purchase_value: number;
  add_to_cart: number;
  initiate_checkout: number;
  date: string;
  campaigns?: { platform: string; campaign_id: string };
}

async function fetchCampaignMetrics(client: SupabaseClient, start: string, end: string): Promise<CampaignMetricRow[]> {
  const { data } = await client
    .from("campaign_metrics")
    .select("spend, impressions, clicks, conversions, purchases, purchase_value, add_to_cart, initiate_checkout, date, campaigns!inner(platform, campaign_id)")
    .gte("date", start)
    .lte("date", end);
  return ((data as unknown) as CampaignMetricRow[]) ?? [];
}

async function fetchStateRevenue(client: SupabaseClient, start: string, end: string) {
  const { data } = await client
    .from("h2s_state_revenue")
    .select("date, state, orders, revenue, prepaid_count, cod_count, rto_count")
    .gte("date", start)
    .lte("date", end);
  return data ?? [];
}

async function fetchShopifySales(client: SupabaseClient, start: string, end: string) {
  const { data } = await client
    .from("shopify_daily_sales")
    .select("date, revenue, orders_count, units_sold")
    .gte("date", start)
    .lte("date", end);
  return data ?? [];
}

async function fetchQuadrants(client: SupabaseClient) {
  const { data } = await client
    .from("h2s_content_quadrants")
    .select("campaign_id, quadrant");
  return data ?? [];
}

async function fetchCohorts(client: SupabaseClient) {
  const { data } = await client
    .from("h2s_ltv_cohorts")
    .select("cohort, total_revenue, replacement_status");
  return data ?? [];
}

async function fetchGa4(client: SupabaseClient, start: string, end: string) {
  const { data } = await client
    .from("ga4_daily")
    .select("date, state, sessions, conversions, revenue, traffic_source")
    .gte("date", start)
    .lte("date", end);
  return data ?? [];
}

async function fetchClarity(client: SupabaseClient, start: string, end: string) {
  const { data } = await client
    .from("clarity_daily")
    .select("date, sessions, rage_clicks, dead_clicks, js_errors")
    .gte("date", start)
    .lte("date", end);
  return data ?? [];
}

async function fetchGokwik(client: SupabaseClient, start: string, end: string) {
  const { data } = await client
    .from("gokwik_daily")
    .select("date, pincode, state, prepaid_orders, cod_orders, rto_orders, revenue, checkouts_started, checkouts_complete")
    .gte("date", start)
    .lte("date", end);
  return data ?? [];
}

async function fetchGsc(client: SupabaseClient, start: string, end: string) {
  const { data } = await client
    .from("gsc_daily_queries")
    .select("query, page, impressions, clicks, ctr, position")
    .gte("date", start)
    .lte("date", end)
    .limit(2000);
  return data ?? [];
}

async function fetchPriorReports(client: SupabaseClient, weekStart: string, limit = 4) {
  const { data } = await client
    .from("h2s_reports")
    .select("week_start, markdown")
    .lt("week_start", weekStart)
    .order("week_start", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ----- Main aggregator -----

export async function aggregateH2sFacts(now: Date = new Date()): Promise<H2sFacts> {
  const client = db();

  // Rolling 7-day windows. Yesterday is the most recent complete day.
  const yesterday = dateMinus(now, 1);
  const thisEnd   = isoDate(yesterday);
  const thisStart = isoDate(dateMinus(yesterday, 6));
  const prevEnd   = isoDate(dateMinus(yesterday, 7));
  const prevStart = isoDate(dateMinus(yesterday, 13));

  const [
    campThis,  campPrev,
    stateThis, statePrev,
    shopThis,  shopPrev,
    quadrants,
    cohorts,
    ga4This,
    clarityThis,
    gokwikThis,
    gscThis,
    priorReports,
  ] = await Promise.all([
    fetchCampaignMetrics(client, thisStart, thisEnd),
    fetchCampaignMetrics(client, prevStart, prevEnd),
    fetchStateRevenue(client, thisStart, thisEnd),
    fetchStateRevenue(client, prevStart, prevEnd),
    fetchShopifySales(client, thisStart, thisEnd),
    fetchShopifySales(client, prevStart, prevEnd),
    fetchQuadrants(client),
    fetchCohorts(client),
    fetchGa4(client, thisStart, thisEnd),
    fetchClarity(client, thisStart, thisEnd),
    fetchGokwik(client, thisStart, thisEnd),
    fetchGsc(client, thisStart, thisEnd),
    fetchPriorReports(client, thisStart),
  ]);

  // -------- Headline metrics --------
  const spendThis   = sum(campThis, (r) => r.spend);
  const spendPrev   = sum(campPrev, (r) => r.spend);
  // Prefer h2s_state_revenue for orders/revenue when present; fall back to shopify_daily_sales.
  const revenueThis = stateThis.length
    ? sum(stateThis, (r) => r.revenue)
    : sum(shopThis,  (r) => r.revenue);
  const revenuePrev = statePrev.length
    ? sum(statePrev, (r) => r.revenue)
    : sum(shopPrev,  (r) => r.revenue);
  const ordersThis  = stateThis.length
    ? sum(stateThis, (r) => r.orders)
    : sum(shopThis,  (r) => r.orders_count);
  const ordersPrev  = statePrev.length
    ? sum(statePrev, (r) => r.orders)
    : sum(shopPrev,  (r) => r.orders_count);

  const cacThis   = ordersThis > 0 ? spendThis / ordersThis : 0;
  const cacPrev   = ordersPrev > 0 ? spendPrev / ordersPrev : 0;
  const roasThis  = spendThis  > 0 ? revenueThis / spendThis  : 0;
  const roasPrev  = spendPrev  > 0 ? revenuePrev / spendPrev  : 0;

  const prepaidThis = sum(stateThis, (r) => r.prepaid_count);
  const codThis     = sum(stateThis, (r) => r.cod_count);
  const rtoThis     = sum(stateThis, (r) => r.rto_count);
  const prepaidPrev = sum(statePrev, (r) => r.prepaid_count);
  const codPrev     = sum(statePrev, (r) => r.cod_count);
  const rtoPrev     = sum(statePrev, (r) => r.rto_count);

  const prepaidPctThis = (prepaidThis + codThis) > 0 ? (prepaidThis / (prepaidThis + codThis)) * 100 : 0;
  const prepaidPctPrev = (prepaidPrev + codPrev) > 0 ? (prepaidPrev / (prepaidPrev + codPrev)) * 100 : 0;
  const rtoPctThis     = ordersThis > 0 ? (rtoThis / ordersThis) * 100 : 0;
  const rtoPctPrev     = ordersPrev > 0 ? (rtoPrev / ordersPrev) * 100 : 0;

  // -------- By state --------
  const stateMap = new Map<string, { orders: number; revenue: number; prepaid: number; rto: number }>();
  for (const row of stateThis) {
    const s = String(row.state);
    const cur = stateMap.get(s) ?? { orders: 0, revenue: 0, prepaid: 0, rto: 0 };
    cur.orders  += row.orders;
    cur.revenue += Number(row.revenue);
    cur.prepaid += row.prepaid_count;
    cur.rto     += row.rto_count;
    stateMap.set(s, cur);
  }
  const stateMapPrev = new Map<string, number>();
  for (const row of statePrev) {
    stateMapPrev.set(String(row.state), (stateMapPrev.get(String(row.state)) ?? 0) + Number(row.revenue));
  }
  const byState = Array.from(stateMap.entries())
    .map(([state, m]) => ({
      state,
      orders: m.orders,
      revenue: m.revenue,
      prepaid_count: m.prepaid,
      rto_count: m.rto,
      is_primary: PRIMARY_STATES.includes(state),
      wow_revenue_pct: wowPct(m.revenue, stateMapPrev.get(state) ?? 0),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // -------- By channel --------
  const channelMap = new Map<string, { spend: number; revenue: number; orders: number }>();
  for (const row of campThis) {
    const platform = row.campaigns?.platform ?? "unknown";
    const cur = channelMap.get(platform) ?? { spend: 0, revenue: 0, orders: 0 };
    cur.spend   += Number(row.spend);
    cur.revenue += Number(row.purchase_value);
    cur.orders  += row.purchases;
    channelMap.set(platform, cur);
  }
  const totalChannelRevenue = sum(Array.from(channelMap.values()), (r) => r.revenue);
  const byChannel = Array.from(channelMap.entries()).map(([channel, m]) => ({
    channel,
    spend: m.spend,
    revenue: m.revenue,
    orders: m.orders,
    roas: m.spend > 0 ? m.revenue / m.spend : 0,
    revenue_share_pct: totalChannelRevenue > 0 ? (m.revenue / totalChannelRevenue) * 100 : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  // -------- By Meta quadrant --------
  const quadByCampaign = new Map<string, string>();
  for (const q of quadrants) {
    quadByCampaign.set(String(q.campaign_id), String(q.quadrant));
  }

  const quadMap = new Map<string, {
    spend: number; revenue: number; impressions: number; clicks: number; campaign_ids: Set<string>;
  }>();
  for (const row of campThis) {
    if (row.campaigns?.platform !== "meta") continue;
    const quadrant = quadByCampaign.get(row.campaigns.campaign_id) ?? "untagged";
    const cur = quadMap.get(quadrant) ?? {
      spend: 0, revenue: 0, impressions: 0, clicks: 0, campaign_ids: new Set<string>(),
    };
    cur.spend       += Number(row.spend);
    cur.revenue     += Number(row.purchase_value);
    cur.impressions += row.impressions;
    cur.clicks      += row.clicks;
    cur.campaign_ids.add(row.campaigns.campaign_id);
    quadMap.set(quadrant, cur);
  }
  const totalQuadSpend = sum(Array.from(quadMap.values()), (r) => r.spend);
  const byQuadrant = Array.from(quadMap.entries()).map(([quadrant, m]) => ({
    quadrant,
    quadrant_label: QUADRANT_LABELS[quadrant] ?? quadrant,
    spend: m.spend,
    revenue: m.revenue,
    impressions: m.impressions,
    clicks: m.clicks,
    ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
    roas: m.spend > 0 ? m.revenue / m.spend : 0,
    spend_share_pct: totalQuadSpend > 0 ? (m.spend / totalQuadSpend) * 100 : 0,
    campaign_count: m.campaign_ids.size,
  })).sort((a, b) => b.spend - a.spend);

  // -------- LTV cohorts --------
  const cohortMap = new Map<string, { count: number; revenue: number; reorders: number }>();
  for (const c of cohorts) {
    const cohort = String(c.cohort);
    const cur = cohortMap.get(cohort) ?? { count: 0, revenue: 0, reorders: 0 };
    cur.count   += 1;
    cur.revenue += Number(c.total_revenue || 0);
    if (c.replacement_status === "reordered") cur.reorders += 1;
    cohortMap.set(cohort, cur);
  }
  const cohortRows = ["new_0_3", "mid_5_7", "replace_9_12", "lapsed_12_plus"].map((cohort) => {
    const m = cohortMap.get(cohort) ?? { count: 0, revenue: 0, reorders: 0 };
    return {
      cohort,
      customer_count: m.count,
      total_revenue: m.revenue,
      reorder_count: m.reorders,
      replacement_rate_pct: m.count > 0 ? (m.reorders / m.count) * 100 : 0,
    };
  });

  // -------- Funnel --------
  const sessions  = sum(ga4This, (r) => r.sessions);
  const atc       = sum(campThis, (r) => r.add_to_cart);
  const ic        = sum(campThis, (r) => r.initiate_checkout);
  const purchases = sum(campThis, (r) => r.purchases);
  const rage      = sum(clarityThis, (r) => r.rage_clicks);
  const dead      = sum(clarityThis, (r) => r.dead_clicks);
  const jsErrors  = sum(clarityThis, (r) => r.js_errors);

  // -------- GSC --------
  const queryMap = new Map<string, { imps: number; clicks: number; pos: number; n: number }>();
  for (const r of gscThis) {
    const q = String(r.query);
    const cur = queryMap.get(q) ?? { imps: 0, clicks: 0, pos: 0, n: 0 };
    cur.imps   += r.impressions;
    cur.clicks += r.clicks;
    cur.pos    += Number(r.position);
    cur.n      += 1;
    queryMap.set(q, cur);
  }
  const queryRows = Array.from(queryMap.entries()).map(([query, m]) => ({
    query,
    impressions: m.imps,
    clicks: m.clicks,
    ctr: m.imps > 0 ? (m.clicks / m.imps) * 100 : 0,
    position: m.n > 0 ? m.pos / m.n : 0,
  }));
  const topConverting = queryRows
    .filter((q) => q.clicks > 0)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10)
    .map(({ query, clicks, position }) => ({ query, clicks, position }));
  const gaps = queryRows
    .filter((q) => q.impressions >= 100 && q.clicks === 0)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map(({ query, impressions, clicks, ctr }) => ({ query, impressions, clicks, ctr }));

  // -------- Prior reports --------
  const prior = priorReports.map((r) => ({
    week_start: String(r.week_start),
    summary_excerpt: String(r.markdown).slice(0, 500),
  }));

  return {
    generated_at: now.toISOString(),
    this_week: { start: thisStart, end: thisEnd },
    prev_week: { start: prevStart, end: prevEnd },

    headline: {
      revenue:      { current: revenueThis,    prev: revenuePrev,    wow_pct: wowPct(revenueThis, revenuePrev) },
      orders:       { current: ordersThis,     prev: ordersPrev,     wow_pct: wowPct(ordersThis, ordersPrev) },
      spend:        { current: spendThis,      prev: spendPrev,      wow_pct: wowPct(spendThis, spendPrev) },
      blended_cac:  { current: cacThis,        prev: cacPrev,        wow_pct: wowPct(cacThis, cacPrev) },
      blended_roas: { current: roasThis,       prev: roasPrev,       wow_pct: wowPct(roasThis, roasPrev) },
      prepaid_pct:  { current: prepaidPctThis, prev: prepaidPctPrev, wow_pct: wowPct(prepaidPctThis, prepaidPctPrev) },
      rto_pct:      { current: rtoPctThis,     prev: rtoPctPrev,     wow_pct: wowPct(rtoPctThis, rtoPctPrev) },
    },

    by_state: byState,
    by_channel: byChannel,
    by_quadrant: byQuadrant,
    cohorts: cohortRows,

    funnel: {
      sessions,
      add_to_cart: atc,
      initiate_checkout: ic,
      purchases,
      rage_clicks: rage,
      dead_clicks: dead,
      js_errors: jsErrors,
      available: {
        ga4: ga4This.length > 0,
        clarity: clarityThis.length > 0,
        gokwik: gokwikThis.length > 0,
      },
    },

    top_queries: {
      converting: topConverting,
      gaps,
      available: gscThis.length > 0,
    },

    anomalies: [],   // filled by detectAnomalies()
    prior_summaries: prior,
  };
}
