"use client";

import { useEffect, useState, useCallback } from "react";
import { Download } from "lucide-react";
import { DateFilter, getDateRange } from "@/components/dashboard/date-filter";
import type { DateRange } from "@/components/dashboard/date-filter";
import { CampaignTable } from "@/components/dashboard/campaign-table";
import type { CampaignWithMetrics } from "@/lib/types";
import { downloadExcel } from "@/lib/export";

export default function CampaignsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { start, end } = getDateRange(dateRange);
    const res = await fetch(
      `/api/campaigns?start_date=${start}&end_date=${end}`
    );
    const data = await res.json();
    setCampaigns(data || []);
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered =
    filter === "all"
      ? campaigns
      : campaigns.filter((c) => c.status === filter);

  function handleDownload() {
    const rows = filtered.map((c) => ({
      "Campaign": c.campaign_name,
      "Platform": c.platform,
      "Status": c.status,
      "Spend (₹)": c.total_spend,
      "Impressions": c.total_impressions,
      "Clicks": c.total_clicks,
      "CTR (%)": Number(c.avg_ctr.toFixed(2)),
      "CPC (₹)": Number(c.avg_cpc.toFixed(2)),
      "Results": c.total_conversions,
      "ROAS": Number(c.avg_roas.toFixed(2)),
    }));
    const date = new Date().toISOString().split("T")[0];
    downloadExcel(rows, "Campaigns", `campaigns_${dateRange}_${date}`);
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-[#1C2B33]">Campaigns</h2>
          <p className="text-[13px] text-[#65676B] mt-0.5">
            All campaigns across connected platforms
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownload}
            disabled={loading || filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#CED0D4] bg-white text-[13px] font-medium text-[#1C2B33] hover:bg-[#F0F2F5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <DateFilter value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 bg-white rounded-lg border border-[#E4E6EB] p-1 w-fit">
        {(["all", "active", "paused"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-1.5 rounded-md text-[13px] font-medium capitalize transition-colors ${
              filter === status
                ? "bg-[#1877F2] text-white"
                : "text-[#65676B] hover:bg-[#F0F2F5]"
            }`}
          >
            {status}
            {status !== "all" && (
              <span className="ml-1.5 text-[11px] opacity-70">
                ({campaigns.filter((c) => c.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <CampaignTable campaigns={filtered} loading={loading} />
    </div>
  );
}
