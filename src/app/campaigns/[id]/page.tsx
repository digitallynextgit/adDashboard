"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Circle } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { DateFilter, getDateRange, getPreviousPeriod } from "@/components/dashboard/date-filter";
import type { DateRange } from "@/components/dashboard/date-filter";
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
  cpc: number;
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
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [daily, setDaily] = useState<DailyDetail[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [prevTotals, setPrevTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { start, end } = getDateRange(dateRange);
    const prev = getPreviousPeriod(dateRange);

    const [currentRes, prevRes] = await Promise.all([
      fetch(`/api/campaigns/${id}/metrics?start_date=${start}&end_date=${end}`),
      fetch(`/api/campaigns/${id}/metrics?start_date=${prev.start}&end_date=${prev.end}`),
    ]);

    const currentData = await currentRes.json();
    const prevData = await prevRes.json();

    setCampaign(currentData.campaign || null);
    setDaily(currentData.daily || []);
    const t = currentData.totals;
    setTotals(t && t.spend !== undefined ? t : null);
    const pt = prevData.totals;
    setPrevTotals(pt && pt.spend !== undefined ? pt : null);
    setLoading(false);
  }, [id, dateRange]);

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

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      {/* Back + Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a
            href="/campaigns"
            className="p-2 rounded-lg border border-[#CED0D4] bg-white hover:bg-[#F0F2F5] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-[#65676B]" />
          </a>
          <div>
            {campaign ? (
              <>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[20px] font-bold text-[#1C2B33]">
                    {campaign.campaign_name}
                  </h2>
                  <StatusDot status={campaign.status} />
                  <span className="text-[13px] text-[#65676B] capitalize">
                    {campaign.status}
                  </span>
                </div>
                <p className="text-[13px] text-[#65676B] mt-0.5 capitalize">
                  {campaign.platform} Ads &middot; ID: {campaign.campaign_id}
                </p>
              </>
            ) : (
              <div className="h-12" />
            )}
          </div>
        </div>
        <DateFilter value={dateRange} onChange={setDateRange} />
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
          value={totals ? totals.cpc.toFixed(2) : "—"}
          change={totals && prevTotals ? calcChange(totals.cpc, prevTotals.cpc) : null}
          prefix="₹"
        />
        <MetricCard
          title="ROAS"
          value={totals ? `${totals.roas.toFixed(2)}x` : "—"}
          change={totals && prevTotals ? calcChange(totals.roas, prevTotals.roas) : null}
        />
      </div>

      {/* Extra stats row */}
      <div className="grid grid-cols-3 gap-4">
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
        <div className="bg-white rounded-xl border border-[#E4E6EB] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E4E6EB]">
            <h3 className="text-[15px] font-semibold text-[#1C2B33]">
              Daily Breakdown
            </h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E4E6EB] bg-[#F8F9FA]">
                <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Spend</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Impressions</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Clicks</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">CTR</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">CPC</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Results</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr
                  key={d.date}
                  className="border-b border-[#E4E6EB] last:border-0 hover:bg-[#F8F9FA]"
                >
                  <td className="px-4 py-3 text-[14px] text-[#1C2B33]">
                    {new Date(d.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] tabular-nums">
                    ₹{d.spend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] tabular-nums">
                    {d.impressions.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] tabular-nums">
                    {d.clicks.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] tabular-nums">
                    {d.ctr.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] tabular-nums">
                    ₹{d.cpc.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] font-medium tabular-nums">
                    {d.conversions}
                  </td>
                  <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] tabular-nums">
                    {d.roas.toFixed(2)}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
