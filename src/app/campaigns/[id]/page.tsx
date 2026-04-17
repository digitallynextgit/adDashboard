"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Circle, Download, FileQuestion } from "lucide-react";
import { downloadExcel } from "@/lib/export";
import { MetricCard } from "@/components/dashboard/metric-card";
import { DateFilter, getDateRange, getPreviousPeriod } from "@/components/dashboard/date-filter";
import { SpendChart } from "@/components/charts/spend-chart";
import { ConversionsChart } from "@/components/charts/conversions-chart";
import type { Campaign, DailyMetric } from "@/lib/types";

interface Totals {
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  cpc: number;
  ctr: number;
  roas: number;
}

interface DailyDetail extends DailyMetric {
  cost_per_result: number;
  ctr: number;
  roas: number;
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "active"
      ? "#31A24C"
      : status === "paused"
        ? "#F7B928"
        : "#8A8D91";
  return <Circle className="h-2.5 w-2.5 fill-current" style={{ color }} />;
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [start, setStart] = useState(() => getDateRange("7d").start);
  const [end,   setEnd]   = useState(() => getDateRange("7d").end);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [daily, setDaily] = useState<DailyDetail[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [prevTotals, setPrevTotals] = useState<Totals | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const prev = getPreviousPeriod(start, end);

    const [currentRes, prevRes] = await Promise.all([
      fetch(`/api/campaigns/${id}/metrics?start_date=${start}&end_date=${end}`),
      fetch(`/api/campaigns/${id}/metrics?start_date=${prev.start}&end_date=${prev.end}`),
    ]);

    const currentData = await currentRes.json();
    const prevData = await prevRes.json();

    const campaign = currentData.campaign || null;
    if (!campaign && !currentData.daily?.length) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setCampaign(campaign);
    setDaily(currentData.daily || []);
    const t = currentData.totals;
    setTotals(t && t.spend !== undefined ? t : null);
    const pt = prevData.totals;
    setPrevTotals(pt && pt.spend !== undefined ? pt : null);
    setLoading(false);
  }, [id, start, end]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function calcChange(current: number, previous: number): number | null {
    if (!prevTotals || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  }

  function formatCurrency(value: number): string {
    if (value >= 10000000) return `${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <FileQuestion className="h-12 w-12 text-[#CED0D4] dark:text-[#2a2a2a] mb-4" />
        <h2 className="text-[18px] font-bold text-[#1C2B33] dark:text-[#ededed]">Campaign not found</h2>
        <p className="text-[13px] text-[#65676B] dark:text-[#888888] mt-1.5 max-w-[280px]">
          No campaign with this ID exists in the selected date range.
        </p>
        <a
          href="/campaigns"
          className="mt-5 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1877F2] text-white text-[13px] font-medium hover:bg-[#166FE5] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Campaigns
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      {/* Back + Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <a
            href="/campaigns"
            className="p-2 rounded-lg border border-[#CED0D4] dark:border-[#2a2a2a] bg-white dark:bg-[#111111] hover:bg-[#F0F2F5] dark:hover:bg-[#1c1c1c] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-[#65676B] dark:text-[#888888]" />
          </a>
          <div>
            {campaign ? (
              <>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[20px] font-bold text-[#1C2B33] dark:text-[#ededed]">
                    {campaign.campaign_name}
                  </h2>
                  <StatusDot status={campaign.status} />
                  <span className="text-[13px] text-[#65676B] dark:text-[#888888] capitalize">
                    {campaign.status}
                  </span>
                </div>
                <p className="text-[13px] text-[#65676B] dark:text-[#888888] mt-0.5 capitalize">
                  {campaign.platform} Ads &middot; ID: {campaign.campaign_id}
                </p>
              </>
            ) : (
              <div className="h-12" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => {
              if (!daily.length) return;
              const rows = daily.map((d) => ({
                "Date": new Date(d.date).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                }),
                "Spend (₹)": d.spend,
                "Impressions": d.impressions,
                "Clicks": d.clicks,
                "CTR (%)": Number(d.ctr.toFixed(2)),
                "Cost per Result (₹)": Number(d.cost_per_result.toFixed(2)),
                "Results": d.conversions,
                "ROAS": Number(d.roas.toFixed(2)),
              }));
              const name = campaign?.campaign_name ?? "campaign";
              const date = new Date().toISOString().split("T")[0];
              downloadExcel(rows, "Daily Breakdown", `${name}_${start}_${end}_${date}`);
            }}
            disabled={loading || daily.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#CED0D4] dark:border-[#2a2a2a] bg-white dark:bg-[#111111] text-[13px] font-medium text-[#1C2B33] dark:text-[#ededed] hover:bg-[#F0F2F5] dark:hover:bg-[#1c1c1c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <DateFilter start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e); }} />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Amount Spent"
          value={totals ? formatCurrency(totals.spend) : "—"}
          change={totals && prevTotals ? calcChange(totals.spend, prevTotals.spend) : null}
          prefix="₹"
        />
        <MetricCard
          title="Results"
          value={totals ? totals.conversions.toLocaleString("en-IN") : "—"}
          change={totals && prevTotals ? calcChange(totals.conversions, prevTotals.conversions) : null}
        />
        <MetricCard
          title="Cost per Result"
          value={totals && totals.conversions > 0 ? (totals.spend / totals.conversions).toFixed(2) : "—"}
          change={totals && prevTotals && prevTotals.conversions > 0 ? calcChange(totals.spend / totals.conversions, prevTotals.spend / prevTotals.conversions) : null}
          prefix="₹"
        />
        <MetricCard
          title="ROAS"
          value={totals ? `${totals.roas.toFixed(2)}x` : "—"}
          change={totals && prevTotals ? calcChange(totals.roas, prevTotals.roas) : null}
        />
      </div>

      {/* Extra stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Impressions"
          value={totals ? totals.impressions.toLocaleString("en-IN") : "—"}
          change={totals && prevTotals ? calcChange(totals.impressions, prevTotals.impressions) : null}
        />
        <MetricCard
          title="Clicks"
          value={totals ? totals.clicks.toLocaleString("en-IN") : "—"}
          change={totals && prevTotals ? calcChange(totals.clicks, prevTotals.clicks) : null}
        />
        <MetricCard
          title="CTR"
          value={totals ? `${totals.ctr.toFixed(2)}%` : "—"}
          change={totals && prevTotals ? calcChange(totals.ctr, prevTotals.ctr) : null}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SpendChart data={daily} loading={loading} />
        <ConversionsChart data={daily} loading={loading} />
      </div>

      {/* Daily breakdown table */}
      {daily.length > 0 && (
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E4E6EB] dark:border-[#2a2a2a]">
            <h3 className="text-[15px] font-semibold text-[#1C2B33] dark:text-[#ededed]">
              Daily Breakdown
            </h3>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#E4E6EB] dark:border-[#2a2a2a] bg-[#F8F9FA] dark:bg-[#161616]">
                <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">Spend</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">Impressions</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">Clicks</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">CTR</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">Cost / Result</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">Results</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr
                  key={d.date}
                  className="border-b border-[#E4E6EB] dark:border-[#2a2a2a] last:border-0 hover:bg-[#F8F9FA] dark:hover:bg-[#1c1c1c]"
                >
                  <td className="px-4 py-3 text-[14px] text-[#1C2B33] dark:text-[#ededed]">
                    {new Date(d.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] dark:text-[#ededed] tabular-nums">
                    ₹{d.spend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] dark:text-[#ededed] tabular-nums">
                    {d.impressions.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] dark:text-[#ededed] tabular-nums">
                    {d.clicks.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] dark:text-[#ededed] tabular-nums">
                    {d.ctr.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] dark:text-[#ededed] tabular-nums">
                    ₹{d.cost_per_result.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] dark:text-[#ededed] font-medium tabular-nums">
                    {d.conversions}
                  </td>
                  <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] dark:text-[#ededed] tabular-nums">
                    {d.roas.toFixed(2)}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
