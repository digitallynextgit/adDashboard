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

interface ConversionsChartProps {
  data: DailyMetric[];
  loading: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function ConversionsChart({ data, loading }: ConversionsChartProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E4E6EB] p-5">
      <div className="mb-4">
        <h3 className="text-[15px] font-semibold text-[#1C2B33]">
          Results
        </h3>
        <p className="text-[13px] text-[#65676B]">Daily conversions</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-[280px] text-[#8A8D91] text-sm">
          Loading...
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[280px] text-[#8A8D91]">
          <p className="text-sm">No data available</p>
          <p className="text-xs mt-1">Sync your ad account to see results</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E4E6EB"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: "#8A8D91", fontSize: 12 }}
              axisLine={{ stroke: "#E4E6EB" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#8A8D91", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [String(value), "Conversions"]}
              labelFormatter={(label) => formatDate(String(label))}
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #E4E6EB",
                borderRadius: "8px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
                fontSize: "13px",
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
      )}
    </div>
  );
}
