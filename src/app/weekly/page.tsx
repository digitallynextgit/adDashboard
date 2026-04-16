"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { downloadExcel } from "@/lib/export";

interface DailyData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  reach: number;
  purchases: number;
  purchase_value: number;
  add_to_cart: number;
  initiate_checkout: number;
  landing_page_views: number;
  video_thruplay: number;
  video_3s_views: number;
}

interface CreativeData {
  ad_id: string;
  ad_name: string;
  adset_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchase_value: number;
  add_to_cart: number;
  video_3s_views: number;
  video_thruplay: number;
  reach: number;
  ctr: number;
  cpc: number;
  roas: number;
  cost_per_purchase: number;
  thumb_stop_rate: number;
}

interface AudienceRow {
  breakdown_value: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchase_value: number;
  ctr: number;
  roas: number;
  spend_share: number;
}

interface SkuData {
  variant_id: string;
  product_title: string;
  variant_title: string;
  sku: string;
  orders_count: number;
  units_sold: number;
  revenue: number;
  aov: number;
  revenue_share: number;
}

interface WeekSummary {
  label: string;
  weekStartKey: string;  // YYYY-MM-DD Monday date for lookups
  startDate: string;
  endDate: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  reach: number;
  cpc: number;
  ctr: number;
  cpm: number;
  frequency: number;
  roas: number;
  purchases: number;
  purchase_value: number;
  cost_per_purchase: number;
  add_to_cart: number;
  cost_per_add_to_cart: number;
  initiate_checkout: number;
  cost_per_initiate_checkout: number;
  landing_page_views: number;
  video_thruplay: number;
  video_3s_views: number;
  thumb_stop_rate: number;
  isCurrent: boolean;
}

function getMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function parseDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtDateShort(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function fmtNum(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

function WowBadge({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
  if (!previous || previous === 0) return <span className="text-[12px] text-[#8A8D91]">—</span>;
  const change = ((current - previous) / previous) * 100;
  const isPositive = change > 0;
  const isGood = invert ? !isPositive : isPositive;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[12px] font-medium ${isGood ? "text-[#31A24C]" : "text-[#E41E3F]"}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? "+" : ""}{change.toFixed(1)}%
    </span>
  );
}

function buildWeekSummary(days: DailyData[], label: string, monday: Date, isCurrent: boolean): WeekSummary {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const spend = days.reduce((s, d) => s + d.spend, 0);
  const impressions = days.reduce((s, d) => s + d.impressions, 0);
  const clicks = days.reduce((s, d) => s + d.clicks, 0);
  const conversions = days.reduce((s, d) => s + d.conversions, 0);
  const revenue = days.reduce((s, d) => s + d.revenue, 0);
  const reach = days.reduce((s, d) => s + d.reach, 0);
  const purchases = days.reduce((s, d) => s + d.purchases, 0);
  const purchaseValue = days.reduce((s, d) => s + d.purchase_value, 0);
  const addToCart = days.reduce((s, d) => s + d.add_to_cart, 0);
  const initiateCheckout = days.reduce((s, d) => s + d.initiate_checkout, 0);
  const landingPageViews = days.reduce((s, d) => s + d.landing_page_views, 0);
  const videoThruplay = days.reduce((s, d) => s + d.video_thruplay, 0);
  const video3sViews = days.reduce((s, d) => s + d.video_3s_views, 0);

  return {
    label,
    weekStartKey: fmtDateKey(monday),
    startDate: fmtDateShort(monday),
    endDate: fmtDateShort(sunday),
    spend, impressions, clicks, conversions, revenue, reach,
    cpc: clicks > 0 ? spend / clicks : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    frequency: reach > 0 ? impressions / reach : 0,
    roas: spend > 0 ? revenue / spend : 0,
    purchases,
    purchase_value: purchaseValue,
    cost_per_purchase: purchases > 0 ? spend / purchases : 0,
    add_to_cart: addToCart,
    cost_per_add_to_cart: addToCart > 0 ? spend / addToCart : 0,
    initiate_checkout: initiateCheckout,
    cost_per_initiate_checkout: initiateCheckout > 0 ? spend / initiateCheckout : 0,
    landing_page_views: landingPageViews,
    video_thruplay: videoThruplay,
    video_3s_views: video3sViews,
    thumb_stop_rate: impressions > 0 ? (video3sViews / impressions) * 100 : 0,
    isCurrent,
  };
}

// A single comparison row for the funnel table
function FunnelRow({ label, thisWeek, prevWeek, format, invert }: {
  label: string;
  thisWeek: number;
  prevWeek: number;
  format: "currency" | "number" | "percent" | "roas";
  invert?: boolean;
}) {
  function fmtValue(v: number) {
    if (format === "currency") return fmtCurrency(v);
    if (format === "percent") return `${v.toFixed(2)}%`;
    if (format === "roas") return `${v.toFixed(2)}x`;
    return fmtNum(v);
  }

  return (
    <tr className="border-b border-[#E4E6EB] last:border-0 hover:bg-[#F8F9FA]">
      <td className="px-4 py-3 text-[14px] text-[#1C2B33] font-medium">{label}</td>
      <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] tabular-nums font-medium">{fmtValue(thisWeek)}</td>
      <td className="px-4 py-3 text-right text-[14px] text-[#65676B] tabular-nums">{fmtValue(prevWeek)}</td>
      <td className="px-4 py-3 text-right">
        <WowBadge current={thisWeek} previous={prevWeek} invert={invert} />
      </td>
    </tr>
  );
}

function FunnelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <tr className="bg-[#F8F9FA]">
        <td colSpan={4} className="px-4 py-2.5 text-[12px] font-bold text-[#1877F2] uppercase tracking-wide">
          {title}
        </td>
      </tr>
      {children}
    </>
  );
}

export default function WeeklyReportPage() {
  const [weeks, setWeeks] = useState<WeekSummary[]>([]);
  const [creatives, setCreatives] = useState<CreativeData[]>([]);
  const [ageGender, setAgeGender] = useState<AudienceRow[]>([]);
  const [regions, setRegions] = useState<AudienceRow[]>([]);
  const [skus, setSkus] = useState<SkuData[]>([]);
  const [shopifyTotals, setShopifyTotals] = useState<{ revenue: number; units_sold: number; orders_count: number; aov: number } | null>(null);
  const [plannedSpend, setPlannedSpend] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [numWeeks, setNumWeeks] = useState(5);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const currentMonday = getMonday(now);
    const startDate = new Date(currentMonday);
    startDate.setDate(startDate.getDate() - (numWeeks - 1) * 7);

    const startStr = fmtDateKey(startDate);
    const endStr = fmtDateKey(now);

    const [metricsRes, creativesRes, ageRes, regionRes, shopifyRes, plannedRes] = await Promise.all([
      fetch(`/api/metrics?start_date=${startStr}&end_date=${endStr}`),
      fetch(`/api/creatives?start_date=${startStr}&end_date=${endStr}&limit=10`),
      fetch(`/api/audience?start_date=${startStr}&end_date=${endStr}&breakdown_type=age_gender`),
      fetch(`/api/audience?start_date=${startStr}&end_date=${endStr}&breakdown_type=region`),
      fetch(`/api/shopify/sales?start_date=${startStr}&end_date=${endStr}`),
      fetch(`/api/planned-spend?start_date=${startStr}&end_date=${endStr}`),
    ]);

    const [metricsData, creativesData, ageData, regionData, shopifyData, plannedData] = await Promise.all([
      metricsRes.json(),
      creativesRes.json(),
      ageRes.json(),
      regionRes.json(),
      shopifyRes.json(),
      plannedRes.json(),
    ]);

    const daily: DailyData[] = metricsData.daily || [];

    const weekMap = new Map<string, DailyData[]>();
    for (const d of daily) {
      const monday = getMonday(parseDate(d.date));
      const key = fmtDateKey(monday);
      if (!weekMap.has(key)) weekMap.set(key, []);
      weekMap.get(key)!.push(d);
    }

    const currentMondayStr = fmtDateKey(currentMonday);
    const sorted = Array.from(weekMap.entries()).sort(([a], [b]) => a.localeCompare(b));

    let weekNum = 1;
    const summaries = sorted.map(([mondayStr, days]) => {
      const isCurrent = mondayStr === currentMondayStr;
      const label = isCurrent ? "Current Week" : `Week ${weekNum++}`;
      return buildWeekSummary(days, label, parseDate(mondayStr), isCurrent);
    });

    setWeeks(summaries);
    setCreatives(creativesData.creatives || []);
    setAgeGender(ageData.breakdown || []);
    setRegions(regionData.breakdown || []);
    setSkus(shopifyData.skus || []);
    setShopifyTotals(shopifyData.totals || null);

    // Build planned spend map: week_start → amount
    const pMap: Record<string, number> = {};
    for (const p of (plannedData.planned_spend || [])) {
      pMap[p.week_start] = Number(p.planned_spend);
    }
    setPlannedSpend(pMap);

    setLoading(false);
  }, [numWeeks]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentWeek = weeks.find((w) => w.isCurrent);
  const previousWeek = weeks.length >= 2 ? weeks[weeks.length - 2] : null;

  function handleExport() {
    if (!currentWeek || !previousWeek) return;
    const rows = [
      { Section: "BUSINESS METRICS", Parameter: "Total Revenue (₹)", "This Week": currentWeek.purchase_value, "Previous Week": previousWeek.purchase_value },
      { Section: "", Parameter: "Total Ad Spend (₹)", "This Week": currentWeek.spend, "Previous Week": previousWeek.spend },
      { Section: "", Parameter: "ROAS", "This Week": Number(currentWeek.roas.toFixed(2)), "Previous Week": Number(previousWeek.roas.toFixed(2)) },
      { Section: "", Parameter: "Cost per Purchase (₹)", "This Week": Number(currentWeek.cost_per_purchase.toFixed(2)), "Previous Week": Number(previousWeek.cost_per_purchase.toFixed(2)) },
      { Section: "TOP OF FUNNEL", Parameter: "Impressions", "This Week": currentWeek.impressions, "Previous Week": previousWeek.impressions },
      { Section: "", Parameter: "Reach", "This Week": currentWeek.reach, "Previous Week": previousWeek.reach },
      { Section: "", Parameter: "CPM (₹)", "This Week": Number(currentWeek.cpm.toFixed(2)), "Previous Week": Number(previousWeek.cpm.toFixed(2)) },
      { Section: "", Parameter: "Frequency", "This Week": Number(currentWeek.frequency.toFixed(2)), "Previous Week": Number(previousWeek.frequency.toFixed(2)) },
      { Section: "MIDDLE OF FUNNEL", Parameter: "CTR (%)", "This Week": Number(currentWeek.ctr.toFixed(2)), "Previous Week": Number(previousWeek.ctr.toFixed(2)) },
      { Section: "", Parameter: "CPC (₹)", "This Week": Number(currentWeek.cpc.toFixed(2)), "Previous Week": Number(previousWeek.cpc.toFixed(2)) },
      { Section: "", Parameter: "Landing Page Views", "This Week": currentWeek.landing_page_views, "Previous Week": previousWeek.landing_page_views },
      { Section: "", Parameter: "3s Video Views", "This Week": currentWeek.video_3s_views, "Previous Week": previousWeek.video_3s_views },
      { Section: "", Parameter: "Thumb Stop Rate (%)", "This Week": Number(currentWeek.thumb_stop_rate.toFixed(2)), "Previous Week": Number(previousWeek.thumb_stop_rate.toFixed(2)) },
      { Section: "BOTTOM OF FUNNEL", Parameter: "Add to Cart", "This Week": currentWeek.add_to_cart, "Previous Week": previousWeek.add_to_cart },
      { Section: "", Parameter: "Cost per ATC (₹)", "This Week": Number(currentWeek.cost_per_add_to_cart.toFixed(2)), "Previous Week": Number(previousWeek.cost_per_add_to_cart.toFixed(2)) },
      { Section: "", Parameter: "Initiate Checkout", "This Week": currentWeek.initiate_checkout, "Previous Week": previousWeek.initiate_checkout },
      { Section: "", Parameter: "Purchases", "This Week": currentWeek.purchases, "Previous Week": previousWeek.purchases },
    ];
    const date = new Date().toISOString().split("T")[0];
    downloadExcel(rows, "Weekly Report", `weekly_funnel_report_${date}`);
  }

  function handleExportWeekly() {
    const rows = weeks.map((w) => ({
      "Week": w.label,
      "Period": `${w.startDate} – ${w.endDate}`,
      "Spend (₹)": w.spend,
      "Revenue (₹)": w.purchase_value,
      "ROAS": Number(w.roas.toFixed(2)),
      "Impressions": w.impressions,
      "Reach": w.reach,
      "Clicks": w.clicks,
      "CTR (%)": Number(w.ctr.toFixed(2)),
      "CPC (₹)": Number(w.cpc.toFixed(2)),
      "CPM (₹)": Number(w.cpm.toFixed(2)),
      "Purchases": w.purchases,
      "CPP (₹)": Number(w.cost_per_purchase.toFixed(2)),
      "Add to Cart": w.add_to_cart,
      "Initiate Checkout": w.initiate_checkout,
      "Landing Page Views": w.landing_page_views,
    }));
    const date = new Date().toISOString().split("T")[0];
    downloadExcel(rows, "All Weeks", `weekly_comparison_${date}`);
  }

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto">
        <div className="bg-white rounded-xl border border-[#E4E6EB] p-12 text-center text-[#8A8D91] text-sm">
          Loading weekly data...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold text-[#1C2B33]">Weekly Report</h2>
          <p className="text-[13px] text-[#65676B] mt-0.5">
            Performance Marketing &middot; Monday to Sunday
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <select
            value={numWeeks}
            onChange={(e) => setNumWeeks(Number(e.target.value))}
            className="appearance-none bg-white border border-[#CED0D4] rounded-lg px-3 py-2 text-[14px] text-[#1C2B33] font-medium cursor-pointer hover:border-[#1877F2] focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] transition-colors"
          >
            <option value={5}>Last 5 weeks</option>
            <option value={8}>Last 8 weeks</option>
            <option value={12}>Last 12 weeks</option>
          </select>
        </div>
      </div>

      {/* This Week vs Last Week — Funnel Report */}
      {currentWeek && previousWeek && (
        <div className="bg-white rounded-xl border border-[#E4E6EB] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E4E6EB] flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold text-[#1C2B33]">
                This Week vs Previous Week
              </h3>
              <p className="text-[12px] text-[#8A8D91] mt-0.5">
                {currentWeek.startDate} – today vs {previousWeek.startDate} – {previousWeek.endDate}
              </p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CED0D4] bg-white text-[13px] font-medium text-[#1C2B33] hover:bg-[#F0F2F5] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-[#E4E6EB]">
                  <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Parameter</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">This Week</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Prev Week</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">WoW</th>
                </tr>
              </thead>
              <tbody>
                <FunnelSection title="Business Metrics">
                  <FunnelRow label="Total Revenue (₹)" thisWeek={currentWeek.purchase_value} prevWeek={previousWeek.purchase_value} format="currency" />
                  <FunnelRow label="Total Ad Spend (₹)" thisWeek={currentWeek.spend} prevWeek={previousWeek.spend} format="currency" />
                  <FunnelRow label="ROAS" thisWeek={currentWeek.roas} prevWeek={previousWeek.roas} format="roas" />
                  <FunnelRow label="Cost per Purchase (₹)" thisWeek={currentWeek.cost_per_purchase} prevWeek={previousWeek.cost_per_purchase} format="currency" invert />
                </FunnelSection>

                <FunnelSection title="Top of Funnel">
                  <FunnelRow label="Impressions" thisWeek={currentWeek.impressions} prevWeek={previousWeek.impressions} format="number" />
                  <FunnelRow label="Reach" thisWeek={currentWeek.reach} prevWeek={previousWeek.reach} format="number" />
                  <FunnelRow label="CPM (₹)" thisWeek={currentWeek.cpm} prevWeek={previousWeek.cpm} format="currency" invert />
                  <FunnelRow label="Frequency" thisWeek={currentWeek.frequency} prevWeek={previousWeek.frequency} format="percent" />
                </FunnelSection>

                <FunnelSection title="Middle of Funnel">
                  <FunnelRow label="CTR (%)" thisWeek={currentWeek.ctr} prevWeek={previousWeek.ctr} format="percent" />
                  <FunnelRow label="CPC (₹)" thisWeek={currentWeek.cpc} prevWeek={previousWeek.cpc} format="currency" invert />
                  <FunnelRow label="Landing Page Views" thisWeek={currentWeek.landing_page_views} prevWeek={previousWeek.landing_page_views} format="number" />
                  <FunnelRow label="3-Second Video Views" thisWeek={currentWeek.video_3s_views} prevWeek={previousWeek.video_3s_views} format="number" />
                  <FunnelRow label="Thumb Stop Rate (%)" thisWeek={currentWeek.thumb_stop_rate} prevWeek={previousWeek.thumb_stop_rate} format="percent" />
                  <FunnelRow label="Video ThruPlay" thisWeek={currentWeek.video_thruplay} prevWeek={previousWeek.video_thruplay} format="number" />
                </FunnelSection>

                <FunnelSection title="Bottom of Funnel">
                  <FunnelRow label="Add to Cart" thisWeek={currentWeek.add_to_cart} prevWeek={previousWeek.add_to_cart} format="number" />
                  <FunnelRow label="Cost per ATC (₹)" thisWeek={currentWeek.cost_per_add_to_cart} prevWeek={previousWeek.cost_per_add_to_cart} format="currency" invert />
                  <FunnelRow label="Initiate Checkout" thisWeek={currentWeek.initiate_checkout} prevWeek={previousWeek.initiate_checkout} format="number" />
                  <FunnelRow label="Cost per Checkout (₹)" thisWeek={currentWeek.cost_per_initiate_checkout} prevWeek={previousWeek.cost_per_initiate_checkout} format="currency" invert />
                  <FunnelRow label="Purchases" thisWeek={currentWeek.purchases} prevWeek={previousWeek.purchases} format="number" />
                </FunnelSection>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Creative Performance */}
      <div className="bg-white rounded-xl border border-[#E4E6EB] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E4E6EB] flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-[#1C2B33]">Creative Performance</h3>
            <p className="text-[12px] text-[#8A8D91] mt-0.5">Top ads by spend · {numWeeks === 1 ? "This week" : `Last ${numWeeks} weeks`}</p>
          </div>
        </div>
        {creatives.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] text-[#8A8D91]">
            No creative data yet — sync will populate this after the migration runs.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-[#E4E6EB] bg-[#F8F9FA]">
                  <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Ad Name</th>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Ad Set</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Spend</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Impressions</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">CTR</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">ROAS</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Purchases</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">CPP</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">TSR</th>
                </tr>
              </thead>
              <tbody>
                {creatives.map((c, i) => (
                  <tr key={c.ad_id} className="border-b border-[#E4E6EB] last:border-0 hover:bg-[#F8F9FA]">
                    <td className="px-4 py-3 text-[13px] text-[#8A8D91]">{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-medium text-[#1C2B33] line-clamp-2 max-w-[200px] block">{c.ad_name}</span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#65676B] max-w-[150px]">
                      <span className="line-clamp-1 block">{c.adset_name || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] text-[#1C2B33] font-medium tabular-nums">{fmtCurrency(c.spend)}</td>
                    <td className="px-4 py-3 text-right text-[13px] text-[#1C2B33] tabular-nums">{fmtNum(c.impressions)}</td>
                    <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                      <span className={c.ctr >= 1.5 ? "text-[#31A24C] font-medium" : "text-[#1C2B33]"}>{c.ctr.toFixed(2)}%</span>
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                      <span className={c.roas >= 2 ? "text-[#31A24C] font-medium" : c.roas > 0 && c.roas < 1 ? "text-[#E41E3F]" : "text-[#1C2B33]"}>{c.roas.toFixed(2)}x</span>
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] text-[#1C2B33] font-medium tabular-nums">{fmtNum(c.purchases)}</td>
                    <td className="px-4 py-3 text-right text-[13px] text-[#1C2B33] tabular-nums">{c.purchases > 0 ? fmtCurrency(c.cost_per_purchase) : "—"}</td>
                    <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                      <span className={c.thumb_stop_rate >= 25 ? "text-[#31A24C] font-medium" : "text-[#1C2B33]"}>{c.thumb_stop_rate.toFixed(1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audience Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Age & Gender */}
        <div className="bg-white rounded-xl border border-[#E4E6EB] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E4E6EB]">
            <h3 className="text-[15px] font-semibold text-[#1C2B33]">Age & Gender</h3>
            <p className="text-[12px] text-[#8A8D91] mt-0.5">Spend share by audience segment</p>
          </div>
          {ageGender.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-[#8A8D91]">
              No audience data yet — will populate after sync.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px]">
                <thead>
                  <tr className="border-b border-[#E4E6EB] bg-[#F8F9FA]">
                    <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Segment</th>
                    <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Spend</th>
                    <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Share</th>
                    <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">CTR</th>
                    <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Purchases</th>
                  </tr>
                </thead>
                <tbody>
                  {ageGender.slice(0, 10).map((row) => {
                    const [age, gender] = row.breakdown_value.split("|");
                    return (
                      <tr key={row.breakdown_value} className="border-b border-[#E4E6EB] last:border-0 hover:bg-[#F8F9FA]">
                        <td className="px-4 py-3">
                          <div className="text-[13px] font-medium text-[#1C2B33]">{age}</div>
                          <div className="text-[12px] text-[#65676B] capitalize">{gender}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] text-[#1C2B33] tabular-nums">{fmtCurrency(row.spend)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="h-1.5 rounded-full bg-[#1877F2]" style={{ width: `${Math.max(4, row.spend_share)}px`, maxWidth: "60px" }} />
                            <span className="text-[12px] text-[#65676B] tabular-nums">{row.spend_share.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-[13px] text-[#1C2B33] tabular-nums">{row.ctr.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right text-[13px] text-[#1C2B33] font-medium tabular-nums">{fmtNum(row.purchases)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Regions */}
        <div className="bg-white rounded-xl border border-[#E4E6EB] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E4E6EB]">
            <h3 className="text-[15px] font-semibold text-[#1C2B33]">Top Regions</h3>
            <p className="text-[12px] text-[#8A8D91] mt-0.5">Spend and conversions by state/city</p>
          </div>
          {regions.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-[#8A8D91]">
              No region data yet — will populate after sync.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[340px]">
                <thead>
                  <tr className="border-b border-[#E4E6EB] bg-[#F8F9FA]">
                    <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Region</th>
                    <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Spend</th>
                    <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Share</th>
                    <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Purchases</th>
                    <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.slice(0, 10).map((row) => (
                    <tr key={row.breakdown_value} className="border-b border-[#E4E6EB] last:border-0 hover:bg-[#F8F9FA]">
                      <td className="px-4 py-3 text-[13px] font-medium text-[#1C2B33]">{row.breakdown_value}</td>
                      <td className="px-4 py-3 text-right text-[13px] text-[#1C2B33] tabular-nums">{fmtCurrency(row.spend)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="h-1.5 rounded-full bg-[#1877F2]" style={{ width: `${Math.max(4, row.spend_share)}px`, maxWidth: "60px" }} />
                          <span className="text-[12px] text-[#65676B] tabular-nums">{row.spend_share.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] text-[#1C2B33] font-medium tabular-nums">{fmtNum(row.purchases)}</td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                        <span className={row.roas >= 2 ? "text-[#31A24C] font-medium" : "text-[#1C2B33]"}>{row.roas > 0 ? `${row.roas.toFixed(2)}x` : "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Product Performance (Shopify) */}
      <div className="bg-white rounded-xl border border-[#E4E6EB] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E4E6EB] flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-[#1C2B33]">Product Performance</h3>
            <p className="text-[12px] text-[#8A8D91] mt-0.5">
              Units sold by SKU from Shopify
              {shopifyTotals && shopifyTotals.orders_count > 0 && (
                <span className="ml-2 text-[#1C2B33]">
                  · {shopifyTotals.orders_count} orders · AOV {fmtCurrency(shopifyTotals.aov)}
                </span>
              )}
            </p>
          </div>
        </div>
        {skus.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] text-[#8A8D91]">
            No Shopify data yet — add credentials in <code className="bg-[#F0F2F5] px-1.5 py-0.5 rounded text-[12px]">scripts/.env</code> and trigger a sync.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-[#E4E6EB] bg-[#F8F9FA]">
                  <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">SKU</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Units Sold</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Orders</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Revenue</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">AOV</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Rev Share</th>
                </tr>
              </thead>
              <tbody>
                {skus.map((s, i) => (
                  <tr key={s.variant_id} className="border-b border-[#E4E6EB] last:border-0 hover:bg-[#F8F9FA]">
                    <td className="px-4 py-3 text-[13px] text-[#8A8D91]">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-medium text-[#1C2B33] line-clamp-1 max-w-[200px]">{s.product_title}</div>
                      {s.variant_title && s.variant_title !== "Default Title" && (
                        <div className="text-[12px] text-[#65676B]">{s.variant_title}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#65676B] font-mono">{s.sku || "—"}</td>
                    <td className="px-4 py-3 text-right text-[14px] font-bold text-[#1C2B33] tabular-nums">{fmtNum(s.units_sold)}</td>
                    <td className="px-4 py-3 text-right text-[13px] text-[#1C2B33] tabular-nums">{fmtNum(s.orders_count)}</td>
                    <td className="px-4 py-3 text-right text-[13px] text-[#1C2B33] tabular-nums">{fmtCurrency(s.revenue)}</td>
                    <td className="px-4 py-3 text-right text-[13px] text-[#1C2B33] tabular-nums">{fmtCurrency(s.aov)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="h-1.5 rounded-full bg-[#1877F2]" style={{ width: `${Math.max(4, s.revenue_share)}px`, maxWidth: "60px" }} />
                        <span className="text-[12px] text-[#65676B] tabular-nums">{s.revenue_share.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Planned vs Actual Spend */}
      <div className="bg-white rounded-xl border border-[#E4E6EB] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E4E6EB] flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-[#1C2B33]">Planned vs Actual Spend</h3>
            <p className="text-[12px] text-[#8A8D91] mt-0.5">Set planned spend per week in Settings</p>
          </div>
          <a
            href="/settings"
            className="text-[12px] text-[#1877F2] font-medium hover:underline"
          >
            Edit planned →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px]">
            <thead>
              <tr className="border-b border-[#E4E6EB] bg-[#F8F9FA]">
                <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Week</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Planned</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Actual</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Variance</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Utilisation</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => {
                const planned = plannedSpend[w.weekStartKey] ?? 0;
                const actual = w.spend;
                const variance = actual - planned;
                const utilisation = planned > 0 ? (actual / planned) * 100 : null;
                const isOver = variance > 0;
                return (
                  <tr
                    key={w.label}
                    className={`border-b border-[#E4E6EB] last:border-0 ${w.isCurrent ? "bg-[#EBF5FF]/40" : "hover:bg-[#F8F9FA]"}`}
                  >
                    <td className="px-4 py-3.5">
                      <span className={`text-[13px] font-medium ${w.isCurrent ? "text-[#1877F2]" : "text-[#1C2B33]"}`}>{w.label}</span>
                      <div className="text-[12px] text-[#65676B]">{w.startDate} – {w.endDate}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-[13px] text-[#1C2B33] tabular-nums">
                      {planned > 0 ? fmtCurrency(planned) : <span className="text-[#8A8D91]">Not set</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[13px] font-medium text-[#1C2B33] tabular-nums">{fmtCurrency(actual)}</td>
                    <td className="px-4 py-3.5 text-right text-[13px] tabular-nums">
                      {planned > 0 ? (
                        <span className={isOver ? "text-[#E41E3F]" : "text-[#31A24C]"}>
                          {isOver ? "+" : ""}{fmtCurrency(variance)}
                        </span>
                      ) : (
                        <span className="text-[#8A8D91]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[13px] tabular-nums">
                      {utilisation !== null ? (
                        <span className={utilisation > 110 ? "text-[#E41E3F] font-medium" : utilisation >= 90 ? "text-[#31A24C] font-medium" : "text-[#F7B928] font-medium"}>
                          {utilisation.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-[#8A8D91]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Week-by-Week Comparison Table */}
      <div className="bg-white rounded-xl border border-[#E4E6EB] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E4E6EB] flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#1C2B33]">
            Week-by-Week Comparison
          </h3>
          <button
            onClick={handleExportWeekly}
            disabled={weeks.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CED0D4] bg-white text-[13px] font-medium text-[#1C2B33] hover:bg-[#F0F2F5] transition-colors disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-[#E4E6EB] bg-[#F8F9FA]">
                <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Week</th>
                <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Period</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Spend</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Revenue</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">ROAS</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Reach</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Clicks</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">CTR</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Purchases</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">CPP</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => {
                const prev = i > 0 ? weeks[i - 1] : null;
                return (
                  <tr
                    key={w.label}
                    className={`border-b border-[#E4E6EB] last:border-0 ${w.isCurrent ? "bg-[#EBF5FF]/40" : "hover:bg-[#F8F9FA]"}`}
                  >
                    <td className="px-4 py-3.5">
                      <span className={`text-[14px] font-medium ${w.isCurrent ? "text-[#1877F2]" : "text-[#1C2B33]"}`}>
                        {w.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-[#65676B] whitespace-nowrap">
                      {w.startDate} – {w.endDate}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="text-[14px] text-[#1C2B33] font-medium tabular-nums">{fmtCurrency(w.spend)}</div>
                      {prev && <WowBadge current={w.spend} previous={prev.spend} />}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="text-[14px] text-[#1C2B33] tabular-nums">{fmtCurrency(w.purchase_value)}</div>
                      {prev && <WowBadge current={w.purchase_value} previous={prev.purchase_value} />}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="text-[14px] text-[#1C2B33] tabular-nums">{w.roas.toFixed(2)}x</div>
                      {prev && <WowBadge current={w.roas} previous={prev.roas} />}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="text-[14px] text-[#1C2B33] tabular-nums">{fmtNum(w.reach)}</div>
                      {prev && <WowBadge current={w.reach} previous={prev.reach} />}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="text-[14px] text-[#1C2B33] tabular-nums">{fmtNum(w.clicks)}</div>
                      {prev && <WowBadge current={w.clicks} previous={prev.clicks} />}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="text-[14px] text-[#1C2B33] tabular-nums">{w.ctr.toFixed(2)}%</div>
                      {prev && <WowBadge current={w.ctr} previous={prev.ctr} />}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="text-[14px] text-[#1C2B33] font-medium tabular-nums">{fmtNum(w.purchases)}</div>
                      {prev && <WowBadge current={w.purchases} previous={prev.purchases} />}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="text-[14px] text-[#1C2B33] tabular-nums">{fmtCurrency(w.cost_per_purchase)}</div>
                      {prev && <WowBadge current={w.cost_per_purchase} previous={prev.cost_per_purchase} invert />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
