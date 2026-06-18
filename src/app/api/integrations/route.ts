/**
 * Aggregated integrations digest.
 * Returns one block per service with status + headline metrics + sample rows.
 * Empty tables → status="pending", metrics=0, rows=[].
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function db(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key);
}

function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }

function dateMinus(d: Date, days: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() - days);
  return r;
}

/** Previous period of equal length, ending the day before `start`. */
function prevPeriod(start: string, end: string): { prevStart: string; prevEnd: string } {
  const s = new Date(start);
  const e = new Date(end);
  const days = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
  const prevEnd = dateMinus(s, 1);
  const prevStart = dateMinus(prevEnd, days - 1);
  return { prevStart: isoDate(prevStart), prevEnd: isoDate(prevEnd) };
}

function pctDelta(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function sum<T>(rows: T[], pick: (r: T) => number): number {
  return rows.reduce((a, r) => a + (Number(pick(r)) || 0), 0);
}

/** Roll up rows by date → array of {date, ...sums} sorted ascending. */
function dailySeries<T extends { date: string }>(
  rows: T[],
  metrics: Record<string, (r: T) => number>
): Array<Record<string, number | string>> {
  const map = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const d = String(r.date);
    const cur = map.get(d) ?? Object.fromEntries(Object.keys(metrics).map((k) => [k, 0]));
    for (const [k, fn] of Object.entries(metrics)) {
      cur[k] = (cur[k] ?? 0) + (Number(fn(r)) || 0);
    }
    map.set(d, cur);
  }
  return Array.from(map.entries())
    .map(([date, m]) => ({ date, ...m }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

interface CampaignMetricRow {
  date: string; spend: number; impressions: number; clicks: number;
  ctr: number; cpc: number; cpm: number; reach: number;
  conversions: number; purchases: number; purchase_value: number;
  add_to_cart: number; initiate_checkout: number; landing_page_views: number;
  campaigns?: { platform: string; campaign_name: string; campaign_id: string; status: string };
}

export async function GET(req: NextRequest) {
  try {
    const client = db();
    const now = new Date();

    // Accept ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD; fall back to last 30 days.
    const qsStart = req.nextUrl.searchParams.get("start_date");
    const qsEnd   = req.nextUrl.searchParams.get("end_date");
    const end   = qsEnd   && ISO_DATE.test(qsEnd)   ? qsEnd   : isoDate(dateMinus(now, 1));
    const start = qsStart && ISO_DATE.test(qsStart) ? qsStart : isoDate(dateMinus(now, 30));

    // ---------- Meta ----------
    const { data: metaRows } = await client
      .from("campaign_metrics")
      .select("date, spend, impressions, clicks, ctr, cpc, cpm, reach, conversions, purchases, purchase_value, add_to_cart, initiate_checkout, landing_page_views, campaigns!inner(platform, campaign_name, campaign_id, status)")
      .gte("date", start)
      .lte("date", end)
      .eq("campaigns.platform", "meta");
    const meta: CampaignMetricRow[] = (metaRows as unknown as CampaignMetricRow[]) ?? [];
    const metaCampaignMap = new Map<string, { name: string; status: string; spend: number; impressions: number; clicks: number; purchases: number; purchase_value: number }>();
    for (const r of meta) {
      const id = r.campaigns?.campaign_id ?? "unknown";
      const cur = metaCampaignMap.get(id) ?? { name: r.campaigns?.campaign_name ?? id, status: r.campaigns?.status ?? "—", spend: 0, impressions: 0, clicks: 0, purchases: 0, purchase_value: 0 };
      cur.spend += Number(r.spend);
      cur.impressions += Number(r.impressions);
      cur.clicks += Number(r.clicks);
      cur.purchases += Number(r.purchases);
      cur.purchase_value += Number(r.purchase_value);
      metaCampaignMap.set(id, cur);
    }
    const metaSpend = sum(meta, (r) => r.spend);
    const metaImp = sum(meta, (r) => r.impressions);
    const metaClicks = sum(meta, (r) => r.clicks);
    const metaPurchases = sum(meta, (r) => r.purchases);
    const metaRevenue = sum(meta, (r) => r.purchase_value);

    // Meta audience breakdowns (top regions)
    const { data: metaBreakdownRows } = await client
      .from("audience_breakdowns")
      .select("breakdown_type, breakdown_value, spend, impressions, clicks, purchases, purchase_value, date")
      .gte("date", start)
      .lte("date", end)
      .eq("breakdown_type", "region")
      .limit(500);
    const breakdownMap = new Map<string, { spend: number; impressions: number; purchases: number; purchase_value: number }>();
    for (const r of metaBreakdownRows ?? []) {
      const key = String(r.breakdown_value);
      const cur = breakdownMap.get(key) ?? { spend: 0, impressions: 0, purchases: 0, purchase_value: 0 };
      cur.spend += Number(r.spend);
      cur.impressions += Number(r.impressions);
      cur.purchases += Number(r.purchases);
      cur.purchase_value += Number(r.purchase_value);
      breakdownMap.set(key, cur);
    }
    const metaRegions = Array.from(breakdownMap.entries())
      .map(([region, m]) => ({ region, ...m }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10);

    // ---------- Shopify (per-SKU) ----------
    const { data: shopRows } = await client
      .from("shopify_daily_sales")
      .select("date, product_title, variant_title, sku, orders_count, units_sold, revenue, variant_id")
      .gte("date", start)
      .lte("date", end);
    const shop = shopRows ?? [];
    const shopUnits  = sum(shop, (r) => r.units_sold);
    const skuMap = new Map<string, { product: string; variant: string; sku: string; orders: number; units: number; revenue: number }>();
    for (const r of shop) {
      const id = String(r.variant_id);
      const cur = skuMap.get(id) ?? {
        product: String(r.product_title), variant: String(r.variant_title), sku: String(r.sku),
        orders: 0, units: 0, revenue: 0,
      };
      cur.orders += r.orders_count;
      cur.units  += r.units_sold;
      cur.revenue += Number(r.revenue);
      skuMap.set(id, cur);
    }
    const topSkus = Array.from(skuMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // ---------- Shopify (daily summary — order-level breakdown) ----------
    const { data: shopSummaryRows } = await client
      .from("shopify_daily_summary")
      .select("date, gross_sales, discounts, returns, net_sales, shipping, taxes, total_sales, orders_count, orders_fulfilled, new_customer_orders, returning_customer_orders")
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true });
    const shopSummary = shopSummaryRows ?? [];
    const shopGross    = sum(shopSummary, (r) => Number(r.gross_sales));
    const shopDiscount = sum(shopSummary, (r) => Number(r.discounts));
    const shopReturns  = sum(shopSummary, (r) => Number(r.returns));
    const shopNet      = sum(shopSummary, (r) => Number(r.net_sales));
    const shopShipping = sum(shopSummary, (r) => Number(r.shipping));
    const shopTaxes    = sum(shopSummary, (r) => Number(r.taxes));
    const shopTotal    = sum(shopSummary, (r) => Number(r.total_sales));
    const shopOrders   = sum(shopSummary, (r) => Number(r.orders_count));
    const shopFulfilled = sum(shopSummary, (r) => Number(r.orders_fulfilled));
    const shopNewOrders = sum(shopSummary, (r) => Number(r.new_customer_orders));
    const shopRetOrders = sum(shopSummary, (r) => Number(r.returning_customer_orders));
    // Fall back to per-SKU revenue total if summary table is empty (pre-migration data)
    const shopRev = shopSummary.length > 0 ? shopTotal : sum(shop, (r) => Number(r.revenue));
    const shopOrdersEff = shopSummary.length > 0 ? shopOrders : sum(shop, (r) => r.orders_count);

    const shopDailySeries = shopSummary.map((r) => ({
      date: String(r.date),
      total_sales: Number(r.total_sales),
      orders: Number(r.orders_count),
      aov: Number(r.orders_count) > 0 ? Number(r.total_sales) / Number(r.orders_count) : 0,
    }));

    // ---------- Shopify (previous period, for WoW-style deltas) ----------
    const { prevStart, prevEnd } = prevPeriod(start, end);
    const { data: shopPrevRows } = await client
      .from("shopify_daily_summary")
      .select("gross_sales, net_sales, total_sales, orders_count, new_customer_orders, returning_customer_orders")
      .gte("date", prevStart)
      .lte("date", prevEnd);
    const shopPrev = shopPrevRows ?? [];
    const prevGross  = sum(shopPrev, (r) => Number(r.gross_sales));
    const prevNet    = sum(shopPrev, (r) => Number(r.net_sales));
    const prevTotal  = sum(shopPrev, (r) => Number(r.total_sales));
    const prevOrders = sum(shopPrev, (r) => Number(r.orders_count));
    const prevNewOrd = sum(shopPrev, (r) => Number(r.new_customer_orders));
    const prevRetOrd = sum(shopPrev, (r) => Number(r.returning_customer_orders));
    const prevAov    = prevOrders > 0 ? prevTotal / prevOrders : 0;
    const prevReturning = (prevNewOrd + prevRetOrd) > 0 ? (prevRetOrd / (prevNewOrd + prevRetOrd)) * 100 : 0;
    const curAov = shopOrdersEff > 0 ? shopRev / shopOrdersEff : 0;
    const curReturning = (shopNewOrders + shopRetOrders) > 0
      ? (shopRetOrders / (shopNewOrders + shopRetOrders)) * 100 : 0;

    const shopDeltas = {
      gross_sales:    pctDelta(shopGross, prevGross),
      net_sales:      pctDelta(shopNet, prevNet),
      total_sales:    pctDelta(shopTotal, prevTotal),
      orders:         pctDelta(shopOrdersEff, prevOrders),
      aov:            pctDelta(curAov, prevAov),
      returning_rate: pctDelta(curReturning, prevReturning),
    };

    // ---------- Shopify (sales by channel) ----------
    const { data: shopChannelRows } = await client
      .from("shopify_channel_sales")
      .select("date, channel, orders_count, revenue")
      .gte("date", start)
      .lte("date", end);
    const channelMapShop = new Map<string, { orders: number; revenue: number }>();
    for (const r of shopChannelRows ?? []) {
      const k = String(r.channel);
      const cur = channelMapShop.get(k) ?? { orders: 0, revenue: 0 };
      cur.orders += Number(r.orders_count);
      cur.revenue += Number(r.revenue);
      channelMapShop.set(k, cur);
    }
    const shopChannels = Array.from(channelMapShop.entries())
      .map(([channel, m]) => ({ channel, orders: m.orders, revenue: m.revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    // ---------- Shopify (sales by referrer) ----------
    const { data: shopReferrerRows } = await client
      .from("shopify_referrer_sales")
      .select("date, referrer, orders_count, revenue")
      .gte("date", start)
      .lte("date", end);
    const referrerMapShop = new Map<string, { orders: number; revenue: number }>();
    for (const r of shopReferrerRows ?? []) {
      const k = String(r.referrer);
      const cur = referrerMapShop.get(k) ?? { orders: 0, revenue: 0 };
      cur.orders += Number(r.orders_count);
      cur.revenue += Number(r.revenue);
      referrerMapShop.set(k, cur);
    }
    const shopReferrers = Array.from(referrerMapShop.entries())
      .map(([referrer, m]) => ({ referrer, orders: m.orders, revenue: m.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // ---------- Shopify (customer cohorts) ----------
    const { data: shopCustomerRows } = await client
      .from("shopify_customers")
      .select("customer_id, first_order_date, orders_count, total_spent");
    const cohortMapShop = new Map<string, { size: number; repeat: number; revenue: number }>();
    for (const r of shopCustomerRows ?? []) {
      if (!r.first_order_date) continue;
      const month = String(r.first_order_date).slice(0, 7);  // YYYY-MM
      const cur = cohortMapShop.get(month) ?? { size: 0, repeat: 0, revenue: 0 };
      cur.size += 1;
      if (Number(r.orders_count) > 1) cur.repeat += 1;
      cur.revenue += Number(r.total_spent);
      cohortMapShop.set(month, cur);
    }
    const shopCohorts = Array.from(cohortMapShop.entries())
      .map(([month, m]) => ({
        month, customers: m.size, repeat_customers: m.repeat,
        repeat_rate: m.size > 0 ? (m.repeat / m.size) * 100 : 0,
        revenue: m.revenue,
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12);

    // ---------- Amazon ----------
    const { data: amazonRows } = await client
      .from("campaign_metrics")
      .select("date, spend, impressions, clicks, purchases, purchase_value, campaigns!inner(platform, campaign_name, campaign_id, status)")
      .gte("date", start)
      .lte("date", end)
      .eq("campaigns.platform", "amazon");
    const amazon = (amazonRows as unknown as CampaignMetricRow[]) ?? [];
    const amazonSpend = sum(amazon, (r) => r.spend);
    const amazonImp = sum(amazon, (r) => r.impressions);
    const amazonClicks = sum(amazon, (r) => r.clicks);
    const amazonOrders = sum(amazon, (r) => r.purchases);
    const amazonRevenue = sum(amazon, (r) => r.purchase_value);

    // ---------- Flipkart ----------
    const { data: fpCampaigns } = await client.from("flipkart_campaigns").select("campaign_id, campaign_name, campaign_type, status, daily_budget");
    const { data: fpMetrics } = await client
      .from("flipkart_metrics")
      .select("campaign_id, date, spend, impressions, clicks, orders, units_sold, revenue, roas")
      .gte("date", start)
      .lte("date", end);
    const fp = fpMetrics ?? [];
    const fpSpend = sum(fp, (r) => Number(r.spend));
    const fpImp = sum(fp, (r) => Number(r.impressions));
    const fpClicks = sum(fp, (r) => Number(r.clicks));
    const fpOrders = sum(fp, (r) => Number(r.orders));
    const fpRevenue = sum(fp, (r) => Number(r.revenue));

    // ---------- GA4 ----------
    const { data: ga4Rows } = await client
      .from("ga4_daily")
      .select("date, state, sessions, users, new_users, engaged_sessions, conversions, revenue, traffic_source")
      .gte("date", start)
      .lte("date", end);
    const ga4 = ga4Rows ?? [];
    const ga4Sessions = sum(ga4, (r) => r.sessions);
    const ga4Users = sum(ga4, (r) => r.users);
    const ga4NewUsers = sum(ga4, (r) => r.new_users);
    const ga4Engaged = sum(ga4, (r) => r.engaged_sessions);
    const ga4Conv = sum(ga4, (r) => r.conversions);
    const ga4Rev = sum(ga4, (r) => Number(r.revenue));
    // by state top
    const ga4StateMap = new Map<string, { sessions: number; conversions: number; revenue: number }>();
    for (const r of ga4) {
      const k = String(r.state);
      const cur = ga4StateMap.get(k) ?? { sessions: 0, conversions: 0, revenue: 0 };
      cur.sessions += r.sessions;
      cur.conversions += r.conversions;
      cur.revenue += Number(r.revenue);
      ga4StateMap.set(k, cur);
    }
    const ga4States = Array.from(ga4StateMap.entries()).map(([state, m]) => ({ state, ...m })).sort((a, b) => b.sessions - a.sessions).slice(0, 10);
    // by source top
    const ga4SrcMap = new Map<string, { sessions: number; conversions: number; revenue: number }>();
    for (const r of ga4) {
      const k = String(r.traffic_source);
      const cur = ga4SrcMap.get(k) ?? { sessions: 0, conversions: 0, revenue: 0 };
      cur.sessions += r.sessions;
      cur.conversions += r.conversions;
      cur.revenue += Number(r.revenue);
      ga4SrcMap.set(k, cur);
    }
    const ga4Sources = Array.from(ga4SrcMap.entries()).map(([source, m]) => ({ source, ...m })).sort((a, b) => b.sessions - a.sessions).slice(0, 10);

    // ---------- GSC ----------
    const { data: gscRows } = await client
      .from("gsc_daily_queries")
      .select("date, query, page, impressions, clicks, ctr, position")
      .gte("date", start)
      .lte("date", end)
      .limit(2000);
    const gsc = gscRows ?? [];
    const queryMap = new Map<string, { imps: number; clicks: number; pos: number; n: number }>();
    for (const r of gsc) {
      const k = String(r.query);
      const cur = queryMap.get(k) ?? { imps: 0, clicks: 0, pos: 0, n: 0 };
      cur.imps += r.impressions;
      cur.clicks += r.clicks;
      cur.pos += Number(r.position);
      cur.n += 1;
      queryMap.set(k, cur);
    }
    const queryRows = Array.from(queryMap.entries()).map(([query, m]) => ({
      query, impressions: m.imps, clicks: m.clicks,
      ctr: m.imps > 0 ? (m.clicks / m.imps) * 100 : 0,
      position: m.n > 0 ? m.pos / m.n : 0,
    }));
    const gscImp = queryRows.reduce((a, b) => a + b.impressions, 0);
    const gscClicks = queryRows.reduce((a, b) => a + b.clicks, 0);
    const gscAvgPos = queryRows.length > 0
      ? queryRows.reduce((a, b) => a + b.position, 0) / queryRows.length
      : 0;
    const topConverting = [...queryRows].filter((q) => q.clicks > 0).sort((a, b) => b.clicks - a.clicks).slice(0, 10);
    const gscGaps = [...queryRows].filter((q) => q.impressions >= 100 && q.clicks === 0).sort((a, b) => b.impressions - a.impressions).slice(0, 10);

    // ---------- Clarity ----------
    const { data: clarityRows } = await client
      .from("clarity_daily")
      .select("date, sessions, rage_clicks, dead_clicks, quick_back, scroll_depth, js_errors")
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false });
    const clarity = clarityRows ?? [];
    const clarSess = sum(clarity, (r) => r.sessions);
    const clarRage = sum(clarity, (r) => r.rage_clicks);
    const clarDead = sum(clarity, (r) => r.dead_clicks);
    const clarQB   = sum(clarity, (r) => r.quick_back);
    const clarJS   = sum(clarity, (r) => r.js_errors);
    const clarScroll = clarity.length > 0
      ? clarity.reduce((a, b) => a + Number(b.scroll_depth || 0), 0) / clarity.length
      : 0;

    // ---------- GoKwik ----------
    const { data: gkRows } = await client
      .from("gokwik_daily")
      .select("date, pincode, state, checkouts_started, checkouts_complete, prepaid_orders, cod_orders, rto_orders, revenue")
      .gte("date", start)
      .lte("date", end);
    const gk = gkRows ?? [];
    const gkStarted = sum(gk, (r) => r.checkouts_started);
    const gkComplete = sum(gk, (r) => r.checkouts_complete);
    const gkPrepaid = sum(gk, (r) => r.prepaid_orders);
    const gkCod = sum(gk, (r) => r.cod_orders);
    const gkRto = sum(gk, (r) => r.rto_orders);
    const gkRev = sum(gk, (r) => Number(r.revenue));
    const gkStateMap = new Map<string, { prepaid: number; cod: number; rto: number; revenue: number }>();
    for (const r of gk) {
      const k = String(r.state);
      const cur = gkStateMap.get(k) ?? { prepaid: 0, cod: 0, rto: 0, revenue: 0 };
      cur.prepaid += r.prepaid_orders;
      cur.cod += r.cod_orders;
      cur.rto += r.rto_orders;
      cur.revenue += Number(r.revenue);
      gkStateMap.set(k, cur);
    }
    const gkStates = Array.from(gkStateMap.entries()).map(([state, m]) => ({ state, ...m })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    const gkPincodeMap = new Map<string, { prepaid: number; cod: number; rto: number }>();
    for (const r of gk) {
      const k = String(r.pincode);
      const cur = gkPincodeMap.get(k) ?? { prepaid: 0, cod: 0, rto: 0 };
      cur.prepaid += r.prepaid_orders;
      cur.cod += r.cod_orders;
      cur.rto += r.rto_orders;
      gkPincodeMap.set(k, cur);
    }
    const gkPincodes = Array.from(gkPincodeMap.entries()).map(([pincode, m]) => ({ pincode, ...m })).sort((a, b) => (b.prepaid + b.cod) - (a.prepaid + a.cod)).slice(0, 10);

    return NextResponse.json({
      window: { start, end },

      meta: {
        status: meta.length > 0 ? "connected" : "pending",
        totals: {
          spend: metaSpend, impressions: metaImp, clicks: metaClicks,
          ctr: metaImp > 0 ? (metaClicks / metaImp) * 100 : 0,
          cpc: metaClicks > 0 ? metaSpend / metaClicks : 0,
          purchases: metaPurchases, revenue: metaRevenue,
          roas: metaSpend > 0 ? metaRevenue / metaSpend : 0,
        },
        daily: dailySeries(meta, {
          spend:     (r) => Number(r.spend),
          purchases: (r) => Number(r.purchases),
        }),
        top_campaigns: Array.from(metaCampaignMap.entries()).map(([id, m]) => ({ campaign_id: id, ...m })).sort((a, b) => b.spend - a.spend).slice(0, 10),
        regions: metaRegions,
      },

      shopify: {
        status: (shop.length > 0 || shopSummary.length > 0) ? "connected" : "pending",
        totals: {
          gross_sales: shopGross,
          discounts: shopDiscount,
          returns: shopReturns,
          net_sales: shopNet,
          shipping: shopShipping,
          taxes: shopTaxes,
          total_sales: shopTotal,
          orders: shopOrdersEff,
          orders_fulfilled: shopFulfilled,
          units: shopUnits,
          revenue: shopRev,
          aov: shopOrdersEff > 0 ? shopRev / shopOrdersEff : 0,
          returning_rate: (shopNewOrders + shopRetOrders) > 0
            ? (shopRetOrders / (shopNewOrders + shopRetOrders)) * 100 : 0,
        },
        deltas: shopDeltas,
        breakdown: {
          gross_sales: shopGross,
          discounts: shopDiscount,
          returns: shopReturns,
          net_sales: shopNet,
          shipping: shopShipping,
          taxes: shopTaxes,
          total_sales: shopTotal,
        },
        daily: shopDailySeries.length > 0 ? shopDailySeries : dailySeries(shop, {
          total_sales: (r) => Number(r.revenue),
          orders:      (r) => Number(r.orders_count),
        }),
        by_channel: shopChannels,
        by_referrer: shopReferrers,
        cohorts: shopCohorts,
        top_skus: topSkus,
      },

      amazon: {
        status: amazon.length > 0 ? "connected" : "pending",
        totals: {
          spend: amazonSpend, impressions: amazonImp, clicks: amazonClicks,
          ctr: amazonImp > 0 ? (amazonClicks / amazonImp) * 100 : 0,
          orders: amazonOrders, revenue: amazonRevenue,
          roas: amazonSpend > 0 ? amazonRevenue / amazonSpend : 0,
          acos: amazonRevenue > 0 ? (amazonSpend / amazonRevenue) * 100 : 0,
        },
        daily: dailySeries(amazon, {
          spend:  (r) => Number(r.spend),
          orders: (r) => Number(r.purchases),
        }),
      },

      flipkart: {
        status: fp.length > 0 ? "connected" : "pending",
        totals: {
          spend: fpSpend, impressions: fpImp, clicks: fpClicks,
          ctr: fpImp > 0 ? (fpClicks / fpImp) * 100 : 0,
          orders: fpOrders, revenue: fpRevenue,
          roas: fpSpend > 0 ? fpRevenue / fpSpend : 0,
        },
        daily: dailySeries(fp as { date: string; spend: number; orders: number }[], {
          spend:  (r) => Number(r.spend),
          orders: (r) => Number(r.orders),
        }),
        campaigns: fpCampaigns ?? [],
      },

      ga4: {
        status: ga4.length > 0 ? "connected" : "pending",
        totals: {
          sessions: ga4Sessions, users: ga4Users, new_users: ga4NewUsers,
          engaged_sessions: ga4Engaged, conversions: ga4Conv, revenue: ga4Rev,
          engagement_rate: ga4Sessions > 0 ? (ga4Engaged / ga4Sessions) * 100 : 0,
          conversion_rate: ga4Sessions > 0 ? (ga4Conv / ga4Sessions) * 100 : 0,
        },
        daily: dailySeries(ga4, {
          sessions:    (r) => Number(r.sessions),
          conversions: (r) => Number(r.conversions),
        }),
        by_state: ga4States,
        by_source: ga4Sources,
      },

      gsc: {
        status: gsc.length > 0 ? "connected" : "pending",
        totals: {
          impressions: gscImp, clicks: gscClicks,
          ctr: gscImp > 0 ? (gscClicks / gscImp) * 100 : 0,
          avg_position: gscAvgPos,
        },
        daily: dailySeries(gsc as { date: string; impressions: number; clicks: number }[], {
          impressions: (r) => Number(r.impressions),
          clicks:      (r) => Number(r.clicks),
        }),
        top_converting: topConverting,
        content_gaps: gscGaps,
      },

      clarity: {
        status: clarity.length > 0 ? "connected" : "pending",
        totals: {
          sessions: clarSess, rage_clicks: clarRage, dead_clicks: clarDead,
          quick_back: clarQB, js_errors: clarJS, scroll_depth: clarScroll,
          frustration_rate: clarSess > 0 ? ((clarRage + clarDead) / clarSess) * 100 : 0,
        },
        daily: clarity.slice(0, 14),
        daily_series: clarity.map((r) => ({
          date: String(r.date),
          sessions: Number(r.sessions),
          frustrations: Number(r.rage_clicks) + Number(r.dead_clicks),
        })).reverse(),  // oldest first for the chart
      },

      gokwik: {
        status: gk.length > 0 ? "connected" : "pending",
        totals: {
          checkouts_started: gkStarted, checkouts_complete: gkComplete,
          prepaid_orders: gkPrepaid, cod_orders: gkCod, rto_orders: gkRto,
          revenue: gkRev,
          prepaid_pct: (gkPrepaid + gkCod) > 0 ? (gkPrepaid / (gkPrepaid + gkCod)) * 100 : 0,
          rto_pct: (gkPrepaid + gkCod) > 0 ? (gkRto / (gkPrepaid + gkCod)) * 100 : 0,
          checkout_completion: gkStarted > 0 ? (gkComplete / gkStarted) * 100 : 0,
        },
        daily: dailySeries(gk as { date: string; revenue: number; rto_orders: number }[], {
          revenue: (r) => Number(r.revenue),
          rto:     (r) => Number(r.rto_orders),
        }),
        by_state: gkStates,
        by_pincode: gkPincodes,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
