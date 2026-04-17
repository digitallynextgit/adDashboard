"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { DateFilter, getDateRange } from "@/components/dashboard/date-filter";
import { CampaignTable } from "@/components/dashboard/campaign-table";
import type { CampaignWithMetrics } from "@/lib/types";
import { downloadExcel } from "@/lib/export";
import { usePlatform } from "@/lib/platform-context";
import { PlatformGate } from "@/components/dashboard/platform-gate";
import { AmazonOverview } from "@/components/amazon/amazon-overview";
import { FlipkartOverview } from "@/components/flipkart/flipkart-overview";

export default function CampaignsPage() {
  const { config } = usePlatform();
  const [start, setStart] = useState(() => getDateRange("7d").start);
  const [end,   setEnd]   = useState(() => getDateRange("7d").end);
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");
  const [currentPage , setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const res = await fetch(
        `/api/campaigns?start_date=${start}&end_date=${end}`
      );
      if (cancelled) return;
      const data = await res.json();
      if (cancelled) return;
      setCampaigns(data || []);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [start, end]);

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

  if (!config.connected) return <PlatformGate config={config} />;
  if (platform === "amazon")   return <AmazonOverview />;
  if (platform === "flipkart") return <FlipkartOverview />;

  return (
    <div className="max-w-300 mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold text-meta-dark dark:text-[#ededed]">Campaigns</h2>
          <p className="text-[13px] text-[#65676B] dark:text-[#888888] mt-0.5">
            All campaigns across connected platforms
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            onClick={handleDownload}
            disabled={loading || filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#CED0D4] dark:border-[#2a2a2a] bg-white dark:bg-[#111111] text-[13px] font-medium text-meta-dark dark:text-[#ededed] hover:bg-meta-sidebar dark:hover:bg-[#1c1c1c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <DateFilter start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e); setCurrentPage(1); }} />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="overflow-x-auto pb-0.5">
        <div className="flex items-center gap-1 bg-white dark:bg-[#111111] rounded-lg border border-[#E4E6EB] dark:border-[#2a2a2a] p-1 w-fit">
          {(["all", "active", "paused"] as const).map((status) => (
            <button
              key={status}
              onClick={() => { setFilter(status); setCurrentPage(1); }}
              className={`px-4 py-1.5 rounded-md text-[13px] font-medium capitalize transition-colors ${
                filter === status
                  ? "bg-meta-blue text-white"
                  : "text-[#65676B] dark:text-[#888888] hover:bg-meta-sidebar dark:hover:bg-[#1c1c1c]"
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <p className="text-[13px] text-[#65676B] dark:text-[#888888]">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} campaigns
          </p>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-[#CED0D4] dark:border-[#2a2a2a] bg-white dark:bg-[#111111] text-[13px] text-meta-dark dark:text-[#ededed] hover:bg-meta-sidebar dark:hover:bg-[#1c1c1c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
              .reduce<(number | "…")[]>((acc, page, idx, arr) => {
                if (idx > 0 && (page as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(page);
                return acc;
              }, [])
              .map((page, idx) =>
                page === "…" ? (
                  <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-[13px] text-[#65676B] dark:text-[#888888]">…</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page as number)}
                    className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-colors ${
                      page === currentPage
                        ? "bg-meta-blue text-white"
                        : "border border-[#CED0D4] dark:border-[#2a2a2a] bg-white dark:bg-[#111111] text-meta-dark dark:text-[#ededed] hover:bg-meta-sidebar dark:hover:bg-[#1c1c1c]"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-[#CED0D4] dark:border-[#2a2a2a] bg-white dark:bg-[#111111] text-[13px] text-meta-dark dark:text-[#ededed] hover:bg-meta-sidebar dark:hover:bg-[#1c1c1c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <CampaignTable campaigns={paginated} loading={loading} startIndex={(currentPage - 1) * ITEMS_PER_PAGE} />
    </div>
  );
}
