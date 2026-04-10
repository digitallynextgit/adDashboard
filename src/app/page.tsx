"use client";

import { useEffect, useState, useCallback } from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { DateFilter, getDateRange, getPreviousPeriod } from "@/components/dashboard/date-filter";
import type { DateRange } from "@/components/dashboard/date-filter";
import { CampaignTable } from "@/components/dashboard/campaign-table";
import { SpendChart } from "@/components/charts/spend-chart";
import { ConversionsChart } from "@/components/charts/conversions-chart";
import type { CampaignWithMetrics, DailyMetric } from "@/lib/types";
import { RefreshCw } from "lucide-react";

interface Totals {
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  cpc: number;
  ctr: number;
  roas: number;
}

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [daily, setDaily] = useState<DailyMetric[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [prevTotals, setPrevTotals] = useState<Totals | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { start, end } = getDateRange(dateRange);
    const prev = getPreviousPeriod(dateRange);

    const [metricsRes, prevMetricsRes, campaignsRes] = await Promise.all([
      fetch(`/api/metrics?start_date=${start}&end_date=${end}`),
      fetch(`/api/metrics?start_date=${prev.start}&end_date=${prev.end}`),
      fetch(`/api/campaigns?start_date=${start}&end_date=${end}`),
    ]);

    const metricsData = await metricsRes.json();
    const prevMetricsData = await prevMetricsRes.json();
    const campaignsData = await campaignsRes.json();

    setDaily(metricsData.daily || []);
    const t = metricsData.totals;
    setTotals(t && t.spend !== undefined ? t : null);
    const pt = prevMetricsData.totals;
    setPrevTotals(pt && pt.spend !== undefined ? pt : null);
    setCampaigns(campaignsData || []);
    setLoading(false);
  }, [dateRange]);

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
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-[#1C2B33]">
            Account Overview
          </h2>
          <p className="text-[13px] text-[#65676B] mt-0.5">
            Performance summary across all campaigns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 rounded-lg border border-[#CED0D4] bg-white hover:bg-[#F0F2F5] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 text-[#65676B] ${loading ? "animate-spin" : ""}`} />
          </button>
          <DateFilter value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Amount Spent"
          value={totals ? formatCurrency(totals.spend) : "—"}
          change={totals && prevTotals ? calcChange(totals.spend, prevTotals.spend) : null}
          prefix="₹"
        />
        <MetricCard
          title="Results"
          value={totals ? totals.conversions.toLocaleString("en-IN") : "—"}
          change={
            totals && prevTotals
              ? calcChange(totals.conversions, prevTotals.conversions)
              : null
          }
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SpendChart data={daily} loading={loading} />
        <ConversionsChart data={daily} loading={loading} />
      </div>

      {/* Campaign table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[16px] font-semibold text-[#1C2B33]">
            Campaigns
          </h3>
          <span className="text-[13px] text-[#65676B]">
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
          </span>
        </div>
        <CampaignTable campaigns={campaigns} loading={loading} />
      </div>
    </div>
  );
}
