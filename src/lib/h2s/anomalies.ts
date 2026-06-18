/**
 * Rules-based anomaly pre-filter for H2S facts.
 *
 * Approach: for a small set of key metrics, compare this week's daily values
 * against the trailing 4-week window. Flag anything >2σ from the trailing mean.
 *
 * Runs server-side. Pure function on top of Supabase reads.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { H2sFacts } from "./aggregate";

interface AnomalyRow {
  metric: string;
  magnitude: string;
  direction: "up" | "down";
  sigma: number;
  notes?: string;
}

function db(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function stats(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

function fmtINR(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

/**
 * Detect anomalies and attach them to the facts object. Returns the mutated
 * facts for chaining convenience.
 */
export async function detectAnomalies(facts: H2sFacts, now: Date = new Date()): Promise<H2sFacts> {
  const client = db();

  // Trailing 28 days ending the day before facts.this_week.start
  const trailEnd   = facts.this_week.start;
  const trailStart = (() => {
    const d = new Date(trailEnd);
    d.setUTCDate(d.getUTCDate() - 28);
    return isoDate(d);
  })();

  const found: AnomalyRow[] = [];

  // --- Daily spend anomaly ---
  const { data: spendRows } = await client
    .from("campaign_metrics")
    .select("date, spend")
    .gte("date", trailStart)
    .lt("date", trailEnd);

  if (spendRows && spendRows.length > 0) {
    const byDay = new Map<string, number>();
    for (const r of spendRows) {
      byDay.set(String(r.date), (byDay.get(String(r.date)) ?? 0) + Number(r.spend));
    }
    const trail = Array.from(byDay.values());
    const { mean, std } = stats(trail);

    if (std > 0 && facts.headline.spend.current > 0) {
      const todaySpend = facts.headline.spend.current / 7;  // avg per-day in this week
      const sigma = (todaySpend - mean) / std;
      if (Math.abs(sigma) >= 2) {
        found.push({
          metric: "daily spend",
          magnitude: `${fmtINR(todaySpend)}/day vs trailing mean ${fmtINR(mean)}`,
          direction: sigma > 0 ? "up" : "down",
          sigma: Number(sigma.toFixed(1)),
          notes: "auction pressure, creative fatigue, or budget shift",
        });
      }
    }
  }

  // --- ROAS anomaly ---
  const { data: roasRows } = await client
    .from("campaign_metrics")
    .select("date, spend, purchase_value")
    .gte("date", trailStart)
    .lt("date", trailEnd);
  if (roasRows && roasRows.length > 0) {
    const byDay = new Map<string, { spend: number; rev: number }>();
    for (const r of roasRows) {
      const cur = byDay.get(String(r.date)) ?? { spend: 0, rev: 0 };
      cur.spend += Number(r.spend);
      cur.rev   += Number(r.purchase_value);
      byDay.set(String(r.date), cur);
    }
    const daily = Array.from(byDay.values()).map((d) => d.spend > 0 ? d.rev / d.spend : 0);
    const { mean, std } = stats(daily);
    const cur = facts.headline.blended_roas.current;
    if (std > 0 && cur > 0) {
      const sigma = (cur - mean) / std;
      if (Math.abs(sigma) >= 2) {
        found.push({
          metric: "blended ROAS",
          magnitude: `${cur.toFixed(2)}x vs trailing mean ${mean.toFixed(2)}x`,
          direction: sigma > 0 ? "up" : "down",
          sigma: Number(sigma.toFixed(1)),
        });
      }
    }
  }

  // --- RTO % anomaly (>5% absolute threshold OR 2σ from trailing) ---
  if (facts.headline.rto_pct.current >= 5) {
    found.push({
      metric: "RTO rate",
      magnitude: `${facts.headline.rto_pct.current.toFixed(1)}% of orders returned`,
      direction: "up",
      sigma: 0,
      notes: "exceeds 5% threshold — check pincode hotspots",
    });
  }

  // --- State-level revenue drops >20% WoW for primary states ---
  for (const s of facts.by_state) {
    if (!s.is_primary || s.wow_revenue_pct === null) continue;
    if (s.wow_revenue_pct <= -20) {
      found.push({
        metric: `revenue (${s.state})`,
        magnitude: `${s.wow_revenue_pct.toFixed(1)}% WoW (${fmtINR(s.revenue)} this week)`,
        direction: "down",
        sigma: 0,
        notes: "primary state — investigate ads + delivery",
      });
    }
  }

  // --- Quadrant ROAS imbalance: any tagged quadrant <0.5x ROAS while spending >10% of share ---
  for (const q of facts.by_quadrant) {
    if (q.quadrant === "untagged") continue;
    if (q.spend_share_pct >= 10 && q.roas > 0 && q.roas < 0.5) {
      found.push({
        metric: `quadrant ROAS (${q.quadrant_label})`,
        magnitude: `${q.roas.toFixed(2)}x on ${q.spend_share_pct.toFixed(0)}% of spend`,
        direction: "down",
        sigma: 0,
        notes: "underperforming theme — consider pausing or reallocating",
      });
    }
  }

  facts.anomalies = found;
  return facts;
}
