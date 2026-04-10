"use client";

import type { CampaignWithMetrics } from "@/lib/types";
import { Circle } from "lucide-react";

interface CampaignTableProps {
  campaigns: CampaignWithMetrics[];
  loading: boolean;
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

export function CampaignTable({ campaigns, loading }: CampaignTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E4E6EB] p-12 text-center text-[#8A8D91] text-sm">
        Loading campaigns...
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E4E6EB] p-12 text-center">
        <p className="text-[#65676B] text-sm">No campaigns found</p>
        <p className="text-[#8A8D91] text-xs mt-1">
          Sync your ad account to see campaign data
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E4E6EB] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#E4E6EB] bg-[#F8F9FA]">
            <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">
              Campaign
            </th>
            <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">
              Status
            </th>
            <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">
              Spend
            </th>
            <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">
              Impressions
            </th>
            <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">
              Clicks
            </th>
            <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">
              CTR
            </th>
            <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">
              CPC
            </th>
            <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">
              Results
            </th>
            <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">
              ROAS
            </th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c, i) => (
            <tr
              key={c.id}
              className="border-b border-[#E4E6EB] last:border-0 hover:bg-[#F8F9FA] transition-colors"
            >
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold"
                    style={{ backgroundColor: "#1877F2" }}
                  >
                    {c.campaign_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#1C2B33] max-w-[200px] truncate">
                      {c.campaign_name}
                    </p>
                    <p className="text-[11px] text-[#8A8D91] capitalize">
                      {c.platform}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-1.5">
                  <StatusDot status={c.status} />
                  <span className="text-[13px] text-[#1C2B33] capitalize">
                    {c.status}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3.5 text-right text-[14px] text-[#1C2B33] font-medium tabular-nums">
                {formatCurrency(c.total_spend)}
              </td>
              <td className="px-4 py-3.5 text-right text-[14px] text-[#1C2B33] tabular-nums">
                {formatNumber(c.total_impressions)}
              </td>
              <td className="px-4 py-3.5 text-right text-[14px] text-[#1C2B33] tabular-nums">
                {formatNumber(c.total_clicks)}
              </td>
              <td className="px-4 py-3.5 text-right text-[14px] text-[#1C2B33] tabular-nums">
                {c.avg_ctr.toFixed(2)}%
              </td>
              <td className="px-4 py-3.5 text-right text-[14px] text-[#1C2B33] tabular-nums">
                {formatCurrency(c.avg_cpc)}
              </td>
              <td className="px-4 py-3.5 text-right text-[14px] text-[#1C2B33] font-medium tabular-nums">
                {formatNumber(c.total_conversions)}
              </td>
              <td className="px-4 py-3.5 text-right text-[14px] text-[#1C2B33] tabular-nums">
                {c.avg_roas.toFixed(2)}x
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
