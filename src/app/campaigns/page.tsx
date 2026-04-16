"use client";

import { useEffect, useState, useCallback } from "react";
import { Download } from "lucide-react";
import { DateFilter, getDateRange } from "@/components/dashboard/date-filter";
import { CampaignTable } from "@/components/dashboard/campaign-table";
import type { CampaignWithMetrics } from "@/lib/types";
import { downloadExcel } from "@/lib/export";

export default function CampaignsPage() {
  const [start, setStart] = useState(() => getDateRange("7d").start);
  const [end,   setEnd]   = useState(() => getDateRange("7d").end);
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");
  const [currentPage , setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/campaigns?start_date=${start}&end_date=${end}`
    );
    const data = await res.json();
    setCampaigns(data || []);
    setLoading(false);
  }, [start, end]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered =
    filter === "all"
      ? campaigns
      : campaigns.filter((c) => c.status === filter);


  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );



  function handleDownload() {
    const rows = filtered.map((c) => ({
      "Campaign": c.campaign_name,
      "Platform": c.platform,
      "Status": c.status,
      "Spend (₹)": c.total_spend,
      "Impressions": c.total_impressions,
      "Clicks": c.total_clicks,
      "CTR (%)": Number(c.avg_ctr.toFixed(2)),
      "Cost per Result (₹)": Number(c.cost_per_result.toFixed(2)),
      "Results": c.total_conversions,
      "ROAS": Number(c.avg_roas.toFixed(2)),
    }));
    const date = new Date().toISOString().split("T")[0];
    downloadExcel(rows, "Campaigns", `campaigns_${start}_${end}_${date}`);
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold text-[#1C2B33]">Campaigns</h2>
          <p className="text-[13px] text-[#65676B] mt-0.5">
            All campaigns across connected platforms
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            onClick={handleDownload}
            disabled={loading || filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#CED0D4] bg-white text-[13px] font-medium text-[#1C2B33] hover:bg-[#F0F2F5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <DateFilter start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e); setCurrentPage(1); }} />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="overflow-x-auto pb-0.5">
      <div className="flex items-center gap-1 bg-white rounded-lg border border-[#E4E6EB] p-1 w-fit">
        {(["all", "active", "paused"] as const).map((status) => (
          <button
            key={status}
            onClick={() => { setFilter(status); setCurrentPage(1); }}
            className={`px-4 py-1.5 rounded-md text-[13px] font-medium capitalize transition-colors ${
              filter === status
                ? "bg-[#1877F2] text-white"
                : "text-[#65676B] hover:bg-[#F0F2F5]"
            }`}
          >
            {status}
            <span className="ml-1.5 text-[11px] opacity-70">
              ({status === "all"
                ? campaigns.length
                : campaigns.filter((c) => c.status === status).length})
            </span>
          </button>
        ))}
      </div>
      </div>
      {totalPages > 1 && (
    <div className="flex items-center justify-between px-1">
      <p className="text-[13px] text-[#65676B]">
        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} campaigns
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setCurrentPage(p => p - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded-lg border border-[#CED0D4] bg-white text-[13px] text-[#1C2B33] hover:bg-[#F0F2F5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-colors ${
              page === currentPage
                ? "bg-[#1877F2] text-white"
                : "border border-[#CED0D4] bg-white text-[#1C2B33] hover:bg-[#F0F2F5]"
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => setCurrentPage(p => p + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 rounded-lg border border-[#CED0D4] bg-white text-[13px] text-[#1C2B33] hover:bg-[#F0F2F5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )}

      <CampaignTable campaigns={paginated} loading={loading} startIndex={(currentPage - 1) * ITEMS_PER_PAGE} />
      {/* Pagination */}
  
    </div>
  );
}
