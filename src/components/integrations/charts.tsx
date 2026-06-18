"use client";

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useTheme } from "@/lib/theme-context";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function compactNumber(value: number): string {
  if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000)    return `${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000)      return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

interface ChartShellProps {
  title: string;
  subtitle: string;
  loading?: boolean;
  isEmpty: boolean;
  children: React.ReactNode;
}

function ChartShell({ title, subtitle, loading, isEmpty, children }: ChartShellProps) {
  return (
    <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] p-4 sm:p-5 flex flex-col min-h-[260px] sm:min-h-[300px]">
      <div className="mb-3">
        <h3 className="text-[15px] font-semibold text-meta-dark dark:text-[#ededed]">{title}</h3>
        <p className="text-[13px] text-[#65676B] dark:text-[#888888]">{subtitle}</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center flex-1 text-[#8A8D91] dark:text-[#616161] text-sm">Loading…</div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center flex-1 text-[#8A8D91] dark:text-[#616161]">
          <p className="text-sm">No data in window</p>
          <p className="text-xs mt-1">Connect this source to see the trend</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0">{children}</div>
      )}
    </div>
  );
}

// ----- Themed colors -----

function useChartColors() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return {
    tick:          isDark ? "#888888" : "#8A8D91",
    grid:          isDark ? "#2a2a2a" : "#E4E6EB",
    tooltipBg:     isDark ? "#111111" : "#fff",
    tooltipBorder: isDark ? "#2a2a2a" : "#E4E6EB",
    tooltipText:   isDark ? "#ededed" : "#1C2B33",
    activeDotStroke: isDark ? "#111111" : "#fff",
  };
}

// ----- Generic line/area chart -----

export interface LineChartProps {
  title: string;
  subtitle: string;
  data: Array<Record<string, number | string>>;
  dataKey: string;
  color: string;
  valueLabel: string;
  prefix?: string;              // e.g. "₹" for currency
  loading?: boolean;
}

export function TrendLineChart({
  title, subtitle, data, dataKey, color, valueLabel, prefix = "", loading,
}: LineChartProps) {
  const c = useChartColors();
  const gradientId = `grad-${dataKey}-${color.replace("#", "")}`;
  const isEmpty = !data || data.length === 0;

  return (
    <ChartShell title={title} subtitle={subtitle} loading={loading} isEmpty={isEmpty}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: c.tick, fontSize: 12 }}
            axisLine={{ stroke: c.grid }}
            tickLine={false}
            height={20}
          />
          <YAxis
            tickFormatter={(v) => `${prefix}${compactNumber(Number(v))}`}
            tick={{ fill: c.tick, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            domain={[0, "auto"]}
          />
          <Tooltip
            formatter={(value) => [`${prefix}${Number(value).toLocaleString("en-IN")}`, valueLabel]}
            labelFormatter={(label) => formatDate(String(label))}
            contentStyle={{
              backgroundColor: c.tooltipBg,
              border: `1px solid ${c.tooltipBorder}`,
              borderRadius: "8px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              fontSize: "13px",
              color: c.tooltipText,
            }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: c.activeDotStroke, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

// ----- Generic bar chart -----

export interface BarChartProps {
  title: string;
  subtitle: string;
  data: Array<Record<string, number | string>>;
  dataKey: string;
  color: string;
  valueLabel: string;
  prefix?: string;
  loading?: boolean;
}

export function TrendBarChart({
  title, subtitle, data, dataKey, color, valueLabel, prefix = "", loading,
}: BarChartProps) {
  const c = useChartColors();
  const isEmpty = !data || data.length === 0;

  return (
    <ChartShell title={title} subtitle={subtitle} loading={loading} isEmpty={isEmpty}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: c.tick, fontSize: 12 }}
            axisLine={{ stroke: c.grid }}
            tickLine={false}
            height={20}
          />
          <YAxis
            tickFormatter={(v) => `${prefix}${compactNumber(Number(v))}`}
            tick={{ fill: c.tick, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            domain={[0, "auto"]}
          />
          <Tooltip
            formatter={(value) => [`${prefix}${Number(value).toLocaleString("en-IN")}`, valueLabel]}
            labelFormatter={(label) => formatDate(String(label))}
            contentStyle={{
              backgroundColor: c.tooltipBg,
              border: `1px solid ${c.tooltipBorder}`,
              borderRadius: "8px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              fontSize: "13px",
              color: c.tooltipText,
            }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
