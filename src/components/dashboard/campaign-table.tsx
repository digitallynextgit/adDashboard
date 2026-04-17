"use client";

import type { CampaignWithMetrics } from "@/lib/types";
import { Circle } from "lucide-react";

interface CampaignTableProps {
  campaigns: CampaignWithMetrics[];
  loading: boolean;
  startIndex?: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
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

export function CampaignTable({ campaigns, loading, startIndex = 0 }: CampaignTableProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] p-12 text-center text-[#8A8D91] dark:text-[#616161] text-sm">
        Loading campaigns...
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] p-12 text-center">
        <p className="text-[#65676B] dark:text-[#888888] text-sm">No campaigns found</p>
        <p className="text-[#8A8D91] dark:text-[#616161] text-xs mt-1">
          Sync your ad account to see campaign data
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full min-w-150">
        <thead>
          <tr className="border-b border-[#E4E6EB] dark:border-[#2a2a2a] bg-[#F8F9FA] dark:bg-[#161616]">
            <th className="text-left px-4 py-3 text-[11px] sm:text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide w-8 sm:w-10">
              #
            </th>
            <th className="text-left px-2 sm:px-4 py-3 text-[11px] sm:text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">
              Campaign
            </th>
            <th className="text-left px-2 sm:px-4 py-3 text-[11px] sm:text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">
              Status
            </th>
            <th className="text-right px-2 sm:px-4 py-3 text-[11px] sm:text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">
              Spend
            </th>
            <th className="text-right px-2 sm:px-4 py-3 text-[11px] sm:text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">
              Impressions
            </th>
            <th className="text-right px-2 sm:px-4 py-3 text-[11px] sm:text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">
              Clicks
            </th>
            <th className="text-right px-2 sm:px-4 py-3 text-[11px] sm:text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">
              CTR
            </th>
            <th className="text-right px-2 sm:px-4 py-3 text-[11px] sm:text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">
              Cost / Result
            </th>
            <th className="text-right px-2 sm:px-4 py-3 text-[11px] sm:text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">
              Results
            </th>
            <th className="text-right px-2 sm:px-4 py-3 text-[11px] sm:text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">
              ROAS
            </th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c, i) => (
            <tr
              key={c.id}
              onClick={() => window.location.href = `/campaigns/${c.id}`}
              className="border-b border-[#E4E6EB] dark:border-[#2a2a2a] last:border-0 hover:bg-[#F8F9FA] dark:hover:bg-[#1c1c1c] transition-colors cursor-pointer"
            >
              <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-[13px] text-[#8A8D91] dark:text-[#616161] tabular-nums">
                {startIndex + i + 1}
              </td>
              <td className="px-2 sm:px-4 py-3 sm:py-3.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold"
                    style={{ backgroundColor: "#1877F2" }}
                  >
                    {c.campaign_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[13px] sm:text-[14px] font-medium text-meta-dark dark:text-[#ededed] max-w-30 sm:max-w-50 truncate">
                      {c.campaign_name}
                    </p>
                    <p className="text-[11px] text-[#8A8D91] dark:text-[#616161] capitalize">
                      {c.platform}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-2 sm:px-4 py-3 sm:py-3.5">
                <div className="flex items-center gap-1.5">
                  <StatusDot status={c.status} />
                  <span className="text-[13px] text-meta-dark dark:text-[#ededed] capitalize">
                    {c.status}
                  </span>
                </div>
              </td>
              <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-right text-[13px] sm:text-[14px] text-meta-dark dark:text-[#ededed] font-medium tabular-nums">
                {formatCurrency(c.total_spend)}
              </td>
              <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-right text-[13px] sm:text-[14px] text-meta-dark dark:text-[#ededed] tabular-nums">
                {formatNumber(c.total_impressions)}
              </td>
              <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-right text-[13px] sm:text-[14px] text-meta-dark dark:text-[#ededed] tabular-nums">
                {formatNumber(c.total_clicks)}
              </td>
              <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-right text-[13px] sm:text-[14px] text-meta-dark dark:text-[#ededed] tabular-nums">
                {c.avg_ctr.toFixed(2)}%
              </td>
              <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-right text-[13px] sm:text-[14px] text-meta-dark dark:text-[#ededed] tabular-nums">
                {formatCurrency(c.cost_per_result)}
              </td>
              <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-right text-[13px] sm:text-[14px] text-meta-dark dark:text-[#ededed] font-medium tabular-nums">
                {formatNumber(c.total_conversions)}
              </td>
              <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-right text-[13px] sm:text-[14px] text-meta-dark dark:text-[#ededed] tabular-nums">
                {c.avg_roas.toFixed(2)}x
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
