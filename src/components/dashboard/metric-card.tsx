"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change: number | null;
  prefix?: string;
}

export function MetricCard({ title, value, change, prefix }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E4E6EB] p-3 sm:p-5 hover:shadow-sm transition-shadow">
      <p className="text-[12px] sm:text-[13px] font-medium text-[#65676B] mb-1">{title}</p>
      <p className="text-[22px] sm:text-[28px] font-bold text-[#1C2B33] tracking-tight leading-tight">
        {prefix}
        {value}
      </p>
      {change !== null && (
        <div className="flex items-center gap-1.5 mt-2">
          {change > 0 ? (
            <div className="flex items-center gap-1 text-[#31A24C]">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-[13px] font-medium">
                +{change.toFixed(1)}%
              </span>
            </div>
          ) : change < 0 ? (
            <div className="flex items-center gap-1 text-[#E41E3F]">
              <TrendingDown className="h-3.5 w-3.5" />
              <span className="text-[13px] font-medium">
                {change.toFixed(1)}%
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[#65676B]">
              <Minus className="h-3.5 w-3.5" />
              <span className="text-[13px] font-medium">0%</span>
            </div>
          )}
          <span className="text-[12px] text-[#8A8D91]">vs prev period</span>
        </div>
      )}
    </div>
  );
}
