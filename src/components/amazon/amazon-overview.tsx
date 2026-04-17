"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { DateFilter, getDateRange, getPreviousPeriod } from "@/components/dashboard/date-filter";
import { SpendChart } from "@/components/charts/spend-chart";

interface AmazonTotals {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  orders: number;
  sales: number;
  acos: number;
  roas: number;
}

interface DailyRow {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  orders: number;
  sales: number;
  acos: number;
  roas: number;
}

function fmt(v: number | undefined, decimals = 0) {
  if (!v) return "—";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: decimals }).format(v);
}
function fmtCurrency(v: number | undefined) {
  if (!v) return "—";
  if (v >= 10000000) return `${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000)   return `${(v / 100000).toFixed(2)}L`;
  if (v >= 1000)     return `${(v / 1000).toFixed(1)}K`;
  return v.toFixed(0);
}

export function AmazonOverview() {
  const [start, setStart] = useState(() => getDateRange("7d").start);
  const [end,   setEnd]   = useState(() => getDateRange("7d").end);
  const [refreshKey, setRefreshKey] = useState(0);
  const [totals,     setTotals]     = useState<AmazonTotals | null>(null);
  const [prevTotals, setPrevTotals] = useState<AmazonTotals | null>(null);
  const [daily,      setDaily]      = useState<DailyRow[]>([]);
  const [campaigns,  setCampaigns]  = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const prev = getPreviousPeriod(start, end);
      const [curRes, prevRes, campRes] = await Promise.all([
        fetch(`/api/amazon/metrics?start_date=${start}&end_date=${end}`),
        fetch(`/api/amazon/metrics?start_date=${prev.start}&end_date=${prev.end}`),
        fetch(`/api/amazon/campaigns?start_date=${start}&end_date=${end}`),
      ]);
      if (cancelled) return;
      const [curData, prevData, campData] = await Promise.all([curRes.json(), prevRes.json(), campRes.json()]);
      if (cancelled) return;
      setTotals(curData.totals?.spend !== undefined ? curData.totals : null);
      setPrevTotals(prevData.totals?.spend !== undefined ? prevData.totals : null);
      setDaily(curData.daily || []);
      setCampaigns(Array.isArray(campData) ? campData : []);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [start, end, refreshKey]);

  function calcChange(cur: number, prev: number) {
    if (!prevTotals || prev === 0) return null;
    return ((cur - prev) / prev) * 100;
  }

  // Map daily to SpendChart-compatible shape
  const spendData = daily.map((d) => ({ date: d.date, spend: d.spend }));

  return (
    <div className="max-w-300 mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold text-[#1C2B33] dark:text-[#ededed]">Amazon Ads — Overview</h2>
          <p className="text-[13px] text-[#65676B] dark:text-[#888888] mt-0.5">
            Sponsored Products performance summary
          </p>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-2 rounded-lg border border-[#CED0D4] dark:border-[#2a2a2a] bg-white dark:bg-[#111111] hover:bg-[#F0F2F5] dark:hover:bg-[#1c1c1c] transition-colors"
          >
            <RefreshCw className={`h-4 w-4 text-[#65676B] dark:text-[#888888] ${loading ? "animate-spin" : ""}`} />
          </button>
          <DateFilter start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e); }} />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard title="Ad Spend"   value={totals ? `₹${fmtCurrency(totals.spend)}`      : "—"} change={totals && prevTotals ? calcChange(totals.spend,       prevTotals.spend)       : null} />
        <MetricCard title="Impressions" value={totals ? fmt(totals.impressions)               : "—"} change={totals && prevTotals ? calcChange(totals.impressions, prevTotals.impressions) : null} />
        <MetricCard title="Orders"     value={totals ? fmt(totals.orders)                     : "—"} change={totals && prevTotals ? calcChange(totals.orders,       prevTotals.orders)      : null} />
        <MetricCard title="ACOS"       value={totals && totals.acos > 0 ? `${totals.acos.toFixed(2)}%` : "—"} change={totals && prevTotals ? calcChange(totals.acos, prevTotals.acos) : null} invert />
        <MetricCard title="ROAS"       value={totals && totals.roas > 0 ? `${totals.roas.toFixed(2)}x` : "—"} change={totals && prevTotals ? calcChange(totals.roas, prevTotals.roas) : null} />
      </div>

      {/* Spend chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SpendChart data={spendData} loading={loading} />

        {/* Sales card */}
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] p-5">
          <h3 className="text-[14px] font-semibold text-[#1C2B33] dark:text-[#ededed] mb-4">Amazon KPIs</h3>
          <div className="space-y-3">
            {[
              { label: "Total Sales (₹)", value: totals?.sales ? `₹${fmtCurrency(totals.sales)}` : "—" },
              { label: "Ad Spend (₹)",    value: totals?.spend ? `₹${fmtCurrency(totals.spend)}` : "—" },
              { label: "ACOS",            value: totals?.acos  ? `${totals.acos.toFixed(2)}%`    : "—" },
              { label: "ROAS",            value: totals?.roas  ? `${totals.roas.toFixed(2)}x`    : "—" },
              { label: "CPC (₹)",         value: totals?.cpc   ? `₹${totals.cpc.toFixed(2)}`     : "—" },
              { label: "CTR",             value: totals?.ctr   ? `${totals.ctr.toFixed(2)}%`     : "—" },
              { label: "Clicks",          value: totals?.clicks ? fmt(totals.clicks)             : "—" },
              { label: "Orders",          value: totals?.orders ? fmt(totals.orders)             : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-1 border-b border-[#F0F2F5] dark:border-[#1c1c1c] last:border-0">
                <span className="text-[13px] text-[#65676B] dark:text-[#888888]">{label}</span>
                <span className="text-[13px] font-medium text-[#1C2B33] dark:text-[#ededed] tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaign table */}
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E4E6EB] dark:border-[#2a2a2a] flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#1C2B33] dark:text-[#ededed]">Campaigns</h3>
          <span className="text-[13px] text-[#65676B] dark:text-[#888888]">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-[13px] text-[#8A8D91] dark:text-[#616161]">Loading...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-[#8A8D91] dark:text-[#616161]">
            No campaigns yet — data will appear once Amazon Ads go live.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-[#E4E6EB] dark:border-[#2a2a2a] bg-[#F8F9FA] dark:bg-[#161616]">
                  {["Campaign", "Type", "Status", "Spend", "Clicks", "Orders", "Sales", "ACOS", "ROAS"].map((h) => (
                    <th key={h} className={`px-4 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide ${h === "Campaign" ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.campaign_id} className="border-b border-[#E4E6EB] dark:border-[#2a2a2a] last:border-0 hover:bg-[#F8F9FA] dark:hover:bg-[#1c1c1c]">
                    <td className="px-4 py-3 text-[13px] font-medium text-[#1C2B33] dark:text-[#ededed] max-w-[200px]">
                      <span className="line-clamp-1 block">{c.campaign_name}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-[12px] text-[#65676B] dark:text-[#888888]">{c.campaign_type}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${c.status === "active" ? "text-[#31A24C] bg-[#E7F6EC] dark:bg-[#064E3B]/40" : "text-[#8A8D91] bg-[#F0F2F5] dark:bg-[#1a1a1a]"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] text-[#1C2B33] dark:text-[#ededed] tabular-nums">{c.spend > 0 ? `₹${fmtCurrency(c.spend)}` : "—"}</td>
                    <td className="px-4 py-3 text-right text-[13px] text-[#1C2B33] dark:text-[#ededed] tabular-nums">{c.clicks > 0 ? fmt(c.clicks) : "—"}</td>
                    <td className="px-4 py-3 text-right text-[13px] font-medium text-[#1C2B33] dark:text-[#ededed] tabular-nums">{c.orders > 0 ? fmt(c.orders) : "—"}</td>
                    <td className="px-4 py-3 text-right text-[13px] text-[#1C2B33] dark:text-[#ededed] tabular-nums">{c.sales > 0 ? `₹${fmtCurrency(c.sales)}` : "—"}</td>
                    <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                      <span className={c.acos > 0 && c.acos < 30 ? "text-[#31A24C] font-medium" : c.acos >= 30 ? "text-[#E41E3F]" : "text-[#8A8D91] dark:text-[#616161]"}>
                        {c.acos > 0 ? `${c.acos.toFixed(1)}%` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                      <span className={c.roas >= 2 ? "text-[#31A24C] font-medium" : c.roas > 0 ? "text-[#1C2B33] dark:text-[#ededed]" : "text-[#8A8D91] dark:text-[#616161]"}>
                        {c.roas > 0 ? `${c.roas.toFixed(2)}x` : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
