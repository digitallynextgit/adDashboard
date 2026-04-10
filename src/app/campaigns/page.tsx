"use client";

import { useEffect, useState, useCallback } from "react";
import { DateFilter, getDateRange } from "@/components/dashboard/date-filter";
import type { DateRange } from "@/components/dashboard/date-filter";
import { CampaignTable } from "@/components/dashboard/campaign-table";
import type { CampaignWithMetrics } from "@/lib/types";

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

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-[#1C2B33]">Campaigns</h2>
          <p className="text-[13px] text-[#65676B] mt-0.5">
            All campaigns across connected platforms
          </p>
        </div>
        <DateFilter value={dateRange} onChange={setDateRange} />
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
