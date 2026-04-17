"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DailyMetric } from "@/lib/types";
import { useTheme } from "@/lib/theme-context";

interface ConversionsChartProps {
  data: DailyMetric[];
  loading: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function ConversionsChart({ data, loading }: ConversionsChartProps) {
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
          Results
        </h3>
        <p className="text-[13px] text-[#65676B] dark:text-[#888888]">Daily conversions</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center flex-1 text-[#8A8D91] dark:text-[#616161] text-sm">
          Loading...
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-[#8A8D91] dark:text-[#616161]">
          <p className="text-sm">No data available</p>
          <p className="text-xs mt-1">Sync your ad account to see results</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
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
              tick={{ fill: tickColor, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              domain={[0, "auto"]}
            />
            <Tooltip
              formatter={(value) => [String(value), "Conversions"]}
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
            <Bar
              dataKey="conversions"
              fill="#1877F2"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
