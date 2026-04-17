"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DailyMetric } from "@/lib/types";
import { useTheme } from "@/lib/theme-context";

interface SpendChartProps {
  data: DailyMetric[];
  loading: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function formatCurrency(value: number): string {
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function SpendChart({ data, loading }: SpendChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const tickColor  = isDark ? "#888888" : "#8A8D91";
  const gridColor  = isDark ? "#2a2a2a" : "#E4E6EB";
  const tooltipBg  = isDark ? "#111111" : "#fff";
  const tooltipBorder = isDark ? "#2a2a2a" : "#E4E6EB";
  const tooltipText   = isDark ? "#ededed" : "#1C2B33";

  return (
    <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] p-4 sm:p-5 flex flex-col min-h-[280px] sm:min-h-[340px]">
      <div className="mb-3">
        <h3 className="text-[15px] font-semibold text-[#1C2B33] dark:text-[#ededed]">
          Amount Spent
        </h3>
        <p className="text-[13px] text-[#65676B] dark:text-[#888888]">Daily spend trend</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center flex-1 text-[#8A8D91] dark:text-[#616161] text-sm">
          Loading...
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-[#8A8D91] dark:text-[#616161]">
          <p className="text-sm">No data available</p>
          <p className="text-xs mt-1">Sync your ad account to see spend data</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1877F2" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#1877F2" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
              tickLine={false}
              height={20}
            />
            <YAxis
              tickFormatter={(v) => `₹${formatCurrency(v)}`}
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              domain={[0, "auto"]}
            />
            <Tooltip
              formatter={(value) => [
                `₹${Number(value).toLocaleString("en-IN")}`,
                "Spend",
              ]}
              labelFormatter={(label) => formatDate(String(label))}
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: "8px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                fontSize: "13px",
                color: tooltipText,
              }}
            />
            <Area
              type="monotone"
              dataKey="spend"
              stroke="#1877F2"
              strokeWidth={2}
              fill="url(#spendGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#1877F2", stroke: isDark ? "#111111" : "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
