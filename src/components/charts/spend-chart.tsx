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
  return (
    <div className="bg-white rounded-xl border border-[#E4E6EB] p-5">
      <div className="mb-4">
        <h3 className="text-[15px] font-semibold text-[#1C2B33]">
          Amount Spent
        </h3>
        <p className="text-[13px] text-[#65676B]">Daily spend trend</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-[280px] text-[#8A8D91] text-sm">
          Loading...
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[280px] text-[#8A8D91]">
          <p className="text-sm">No data available</p>
          <p className="text-xs mt-1">Sync your ad account to see spend data</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1877F2" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#1877F2" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              tickFormatter={(v) => `₹${formatCurrency(v)}`}
              tick={{ fill: "#8A8D91", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [
                `₹${Number(value).toLocaleString("en-IN")}`,
                "Spend",
              ]}
              labelFormatter={(label) => formatDate(String(label))}
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #E4E6EB",
                borderRadius: "8px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
                fontSize: "13px",
              }}
            />
            <Area
              type="monotone"
              dataKey="spend"
              stroke="#1877F2"
              strokeWidth={2}
              fill="url(#spendGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#1877F2", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
