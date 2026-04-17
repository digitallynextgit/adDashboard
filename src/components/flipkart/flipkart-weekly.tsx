"use client";

import { useEffect, useState } from "react";
import { DateFilter, getDateRange } from "@/components/dashboard/date-filter";

const FK_BLUE = "#2874F0";

interface WeekRow {
  week: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  orders: number;
  revenue: number;
  roas: number;
}

interface DailyRow {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  orders: number;
  revenue: number;
  roas: number;
}

function dash(v: number, decimals = 0, prefix = "", suffix = "") {
  if (!v || v === 0) return "—";
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: decimals }).format(v);
  return `${prefix}${formatted}${suffix}`;
}

function fmtCurrency(v: number) {
  if (!v || v === 0) return "—";
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000)   return `₹${(v / 100000).toFixed(2)}L`;
  if (v >= 1000)     return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function weekLabel(mondayStr: string): string {
  const monday = new Date(mondayStr + "T00:00:00");
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return `${monday.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#E4E6EB] dark:border-[#2a2a2a]" style={{ backgroundColor: FK_BLUE }}>
        <h3 className="text-[14px] font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-[#F0F2F5] dark:border-[#1c1c1c] last:border-0 px-5">
      <span className="text-[13px] text-[#65676B] dark:text-[#888888]">{label}</span>
      <span className="text-[13px] font-medium text-[#1C2B33] dark:text-[#ededed] tabular-nums">{value}</span>
    </div>
  );
}

export function FlipkartWeekly() {
  const [start, setStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 56);
    return d.toISOString().split("T")[0];
  });
  const [end, setEnd] = useState(() => new Date().toISOString().split("T")[0]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/flipkart/metrics?start_date=${start}&end_date=${end}`);
      if (cancelled) return;
      const data = await res.json();
      if (cancelled) return;
      setDaily(data.daily || []);
      setTotals(data.totals || null);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [start, end]);

  // Group daily data by week
  const weekMap = new Map<string, WeekRow>();
  for (const d of daily) {
    const monday = getMonday(d.date);
    const existing = weekMap.get(monday) ?? {
      week: monday, spend: 0, impressions: 0, clicks: 0,
      ctr: 0, cpc: 0, orders: 0, revenue: 0, roas: 0,
    };
    existing.spend       += d.spend;
    existing.impressions += d.impressions;
    existing.clicks      += d.clicks;
    existing.orders      += d.orders;
    existing.revenue     += d.revenue;
    weekMap.set(monday, existing);
  }

  const weeks: WeekRow[] = Array.from(weekMap.values())
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((w) => ({
      ...w,
      ctr:  w.impressions > 0 ? (w.clicks / w.impressions) * 100 : 0,
      cpc:  w.clicks > 0 ? w.spend / w.clicks : 0,
      roas: w.spend > 0 ? w.revenue / w.spend : 0,
    }));

  const WEEK_COLS = [
    { key: "spend",       label: "Spend",       fmt: (v: number) => fmtCurrency(v) },
    { key: "impressions", label: "Impressions",  fmt: (v: number) => dash(v) },
    { key: "clicks",      label: "Clicks",       fmt: (v: number) => dash(v) },
    { key: "ctr",         label: "CTR",          fmt: (v: number) => dash(v, 2, "", "%") },
    { key: "orders",      label: "Orders",       fmt: (v: number) => dash(v) },
    { key: "revenue",     label: "Revenue",      fmt: (v: number) => fmtCurrency(v) },
    { key: "roas",        label: "ROAS",         fmt: (v: number) => dash(v, 2, "", "x") },
    { key: "cpc",         label: "CPC",          fmt: (v: number) => dash(v, 2, "₹") },
  ];

  return (
    <div className="max-w-300 mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold text-[#1C2B33] dark:text-[#ededed]">Flipkart Ads — Weekly Report</h2>
          <p className="text-[13px] text-[#65676B] dark:text-[#888888] mt-0.5">
            Week-by-week performance breakdown
          </p>
        </div>
        <DateFilter start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e); }} />
      </div>

      {/* Business Metrics */}
      <Section title="Business Metrics">
        {loading ? (
          <div className="p-5 text-[13px] text-[#8A8D91] dark:text-[#616161]">Loading...</div>
        ) : (
          <>
            <MetricRow label="Total Revenue"  value={fmtCurrency(totals?.revenue)} />
            <MetricRow label="Total Ad Spend" value={fmtCurrency(totals?.spend)} />
            <MetricRow label="ROAS"           value={totals?.roas > 0 ? `${totals.roas.toFixed(2)}x` : "—"} />
            <MetricRow label="Total Orders"   value={totals?.orders > 0 ? new Intl.NumberFormat("en-IN").format(totals.orders) : "—"} />
          </>
        )}
      </Section>

      {/* Traffic Metrics */}
      <Section title="Traffic Metrics">
        {loading ? (
          <div className="p-5 text-[13px] text-[#8A8D91] dark:text-[#616161]">Loading...</div>
        ) : (
          <>
            <MetricRow label="Impressions"  value={totals?.impressions > 0 ? new Intl.NumberFormat("en-IN").format(totals.impressions) : "—"} />
            <MetricRow label="Clicks"       value={totals?.clicks > 0 ? new Intl.NumberFormat("en-IN").format(totals.clicks) : "—"} />
            <MetricRow label="CTR"          value={totals?.ctr > 0 ? `${totals.ctr.toFixed(2)}%` : "—"} />
            <MetricRow label="CPC (₹)"      value={totals?.cpc > 0 ? `₹${totals.cpc.toFixed(2)}` : "—"} />
          </>
        )}
      </Section>

      {/* Week-by-week table */}
      <Section title="Week-by-Week Breakdown">
        {loading ? (
          <div className="p-5 text-[13px] text-[#8A8D91] dark:text-[#616161]">Loading...</div>
        ) : weeks.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-[#8A8D91] dark:text-[#616161]">
            No data yet — will populate once Flipkart Ads are live.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#E4E6EB] dark:border-[#2a2a2a] bg-[#F8F9FA] dark:bg-[#161616]">
                  <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">Week</th>
                  {WEEK_COLS.map((c) => (
                    <th key={c.key} className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.week} className="border-b border-[#E4E6EB] dark:border-[#2a2a2a] last:border-0 hover:bg-[#F8F9FA] dark:hover:bg-[#1c1c1c]">
                    <td className="px-4 py-3 text-[13px] text-[#1C2B33] dark:text-[#ededed]">{weekLabel(w.week)}</td>
                    {WEEK_COLS.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-right text-[13px] text-[#1C2B33] dark:text-[#ededed] tabular-nums">
                        {c.fmt((w as any)[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
