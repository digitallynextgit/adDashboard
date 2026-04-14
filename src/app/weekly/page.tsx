"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { downloadExcel } from "@/lib/export";

interface DailyData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

interface WeekSummary {
  label: string;
  startDate: string;
  endDate: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  cpc: number;
  ctr: number;
  roas: number;
  isCurrent: boolean;
}

interface CumulativeDay {
  date: string;
  dayLabel: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpc: number;
  ctr: number;
  roas: number;
}

function getMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function parseDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
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

function WowBadge({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
  if (!previous || previous === 0) return <span className="text-[12px] text-[#8A8D91]">—</span>;
  const change = ((current - previous) / previous) * 100;
  const isPositive = change > 0;
  const isGood = invert ? !isPositive : isPositive;

  return (
    <span className={`inline-flex items-center gap-0.5 text-[12px] font-medium ${isGood ? "text-[#31A24C]" : "text-[#E41E3F]"}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? "+" : ""}{change.toFixed(1)}%
    </span>
  );
}

export default function WeeklyReportPage() {
  const [weeks, setWeeks] = useState<WeekSummary[]>([]);
  const [cumulativeDays, setCumulativeDays] = useState<CumulativeDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [numWeeks, setNumWeeks] = useState(5);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const now = new Date();
    const currentMonday = getMonday(now);
    const startDate = new Date(currentMonday);
    startDate.setDate(startDate.getDate() - (numWeeks - 1) * 7);
    const endDate = now;

    const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
    const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

    const res = await fetch(`/api/metrics?start_date=${startStr}&end_date=${endStr}`);
    const data = await res.json();
    const daily: DailyData[] = data.daily || [];

    // Group by week (Monday-based)
    const weekMap = new Map<string, DailyData[]>();
    for (const d of daily) {
      const monday = getMonday(parseDate(d.date));
      const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
      if (!weekMap.has(key)) weekMap.set(key, []);
      weekMap.get(key)!.push(d);
    }

    const currentMondayStr = `${currentMonday.getFullYear()}-${String(currentMonday.getMonth() + 1).padStart(2, "0")}-${String(currentMonday.getDate()).padStart(2, "0")}`;

    // Build week summaries
    const sortedWeeks = Array.from(weekMap.entries()).sort(([a], [b]) => a.localeCompare(b));

    let weekNum = 1;
    const weekSummaries: WeekSummary[] = sortedWeeks.map(([mondayStr, days]) => {
      const totalSpend = days.reduce((s, d) => s + d.spend, 0);
      const totalImpressions = days.reduce((s, d) => s + d.impressions, 0);
      const totalClicks = days.reduce((s, d) => s + d.clicks, 0);
      const totalConversions = days.reduce((s, d) => s + d.conversions, 0);
      const totalRevenue = days.reduce((s, d) => s + d.revenue, 0);
      const isCurrent = mondayStr === currentMondayStr;

      const monday = parseDate(mondayStr);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);

      const label = isCurrent ? "Current Week" : `Week ${weekNum++}`;

      return {
        label,
        startDate: formatDateShort(monday),
        endDate: formatDateShort(sunday),
        spend: totalSpend,
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        revenue: totalRevenue,
        cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
        isCurrent,
      };
    });

    setWeeks(weekSummaries);

    // Build current week cumulative days
    const currentDays = (weekMap.get(currentMondayStr) || []).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    let cumSpend = 0, cumImp = 0, cumClicks = 0, cumConv = 0, cumRev = 0;
    const cumDays: CumulativeDay[] = currentDays.map((d) => {
      cumSpend += d.spend;
      cumImp += d.impressions;
      cumClicks += d.clicks;
      cumConv += d.conversions;
      cumRev += d.revenue;

      const date = parseDate(d.date);
      return {
        date: d.date,
        dayLabel: date.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
        spend: cumSpend,
        impressions: cumImp,
        clicks: cumClicks,
        conversions: cumConv,
        cpc: cumClicks > 0 ? cumSpend / cumClicks : 0,
        ctr: cumImp > 0 ? (cumClicks / cumImp) * 100 : 0,
        roas: cumSpend > 0 ? cumRev / cumSpend : 0,
      };
    });

    setCumulativeDays(cumDays);
    setLoading(false);
  }, [numWeeks]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentWeek = weeks.find((w) => w.isCurrent);
  const previousWeek = weeks.length >= 2 ? weeks[weeks.length - 2] : null;

  function calcChange(current: number, previous: number): number | null {
    if (!previousWeek || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  }

  function formatVal(value: number): string {
    if (value >= 10000000) return `${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  }

  function handleExportWeeks() {
    const rows = weeks.map((w) => ({
      "Week": w.label,
      "Period": `${w.startDate} – ${w.endDate}`,
      "Spend (₹)": w.spend,
      "Impressions": w.impressions,
      "Clicks": w.clicks,
      "CTR (%)": Number(w.ctr.toFixed(2)),
      "CPC (₹)": Number(w.cpc.toFixed(2)),
      "Results": w.conversions,
      "ROAS": Number(w.roas.toFixed(2)),
    }));
    const date = new Date().toISOString().split("T")[0];
    downloadExcel(rows, "Weekly Summary", `weekly_report_${date}`);
  }

  function handleExportDaily() {
    const rows = cumulativeDays.map((d) => ({
      "Day": d.dayLabel,
      "Spend (₹) Cumulative": d.spend,
      "Impressions Cumulative": d.impressions,
      "Clicks Cumulative": d.clicks,
      "CTR (%)": Number(d.ctr.toFixed(2)),
      "CPC (₹)": Number(d.cpc.toFixed(2)),
      "Results Cumulative": d.conversions,
      "ROAS": Number(d.roas.toFixed(2)),
    }));
    const date = new Date().toISOString().split("T")[0];
    downloadExcel(rows, "Current Week", `current_week_progress_${date}`);
  }

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto">
        <div className="bg-white rounded-xl border border-[#E4E6EB] p-12 text-center text-[#8A8D91] text-sm">
          Loading weekly data...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold text-[#1C2B33]">
            Weekly Report
          </h2>
          <p className="text-[13px] text-[#65676B] mt-0.5">
            Week-by-week performance &middot; Monday to Sunday
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <select
            value={numWeeks}
            onChange={(e) => setNumWeeks(Number(e.target.value))}
            className="appearance-none bg-white border border-[#CED0D4] rounded-lg px-3 py-2 text-[14px] text-[#1C2B33] font-medium cursor-pointer hover:border-[#1877F2] focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] transition-colors"
          >
            <option value={5}>Last 5 weeks</option>
            <option value={8}>Last 8 weeks</option>
            <option value={12}>Last 12 weeks</option>
          </select>
        </div>
      </div>

      {/* This Week Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="This Week Spend"
          value={currentWeek ? formatVal(currentWeek.spend) : "—"}
          change={currentWeek && previousWeek ? calcChange(currentWeek.spend, previousWeek.spend) : null}
          prefix="₹"
        />
        <MetricCard
          title="This Week Results"
          value={currentWeek ? formatNumber(currentWeek.conversions) : "—"}
          change={currentWeek && previousWeek ? calcChange(currentWeek.conversions, previousWeek.conversions) : null}
        />
        <MetricCard
          title="CPC"
          value={currentWeek ? currentWeek.cpc.toFixed(2) : "—"}
          change={currentWeek && previousWeek ? calcChange(currentWeek.cpc, previousWeek.cpc) : null}
          prefix="₹"
        />
        <MetricCard
          title="ROAS"
          value={currentWeek ? `${currentWeek.roas.toFixed(2)}x` : "—"}
          change={currentWeek && previousWeek ? calcChange(currentWeek.roas, previousWeek.roas) : null}
        />
      </div>

      {/* Week-by-Week Comparison Table */}
      <div className="bg-white rounded-xl border border-[#E4E6EB] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E4E6EB] flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#1C2B33]">
            Week-by-Week Comparison
          </h3>
          <button
            onClick={handleExportWeeks}
            disabled={weeks.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CED0D4] bg-white text-[13px] font-medium text-[#1C2B33] hover:bg-[#F0F2F5] transition-colors disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[#E4E6EB] bg-[#F8F9FA]">
                <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Week</th>
                <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Period</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Spend</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Impressions</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Clicks</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">CTR</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">CPC</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Results</th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => {
                const prev = i > 0 ? weeks[i - 1] : null;
                return (
                  <tr
                    key={w.label}
                    className={`border-b border-[#E4E6EB] last:border-0 ${w.isCurrent ? "bg-[#EBF5FF]/40" : "hover:bg-[#F8F9FA]"}`}
                  >
                    <td className="px-4 py-3.5">
                      <span className={`text-[14px] font-medium ${w.isCurrent ? "text-[#1877F2]" : "text-[#1C2B33]"}`}>
                        {w.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-[#65676B] whitespace-nowrap">
                      {w.startDate} – {w.endDate}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="text-[14px] text-[#1C2B33] font-medium tabular-nums">{formatCurrency(w.spend)}</div>
                      {prev && <WowBadge current={w.spend} previous={prev.spend} />}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="text-[14px] text-[#1C2B33] tabular-nums">{formatNumber(w.impressions)}</div>
                      {prev && <WowBadge current={w.impressions} previous={prev.impressions} />}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="text-[14px] text-[#1C2B33] tabular-nums">{formatNumber(w.clicks)}</div>
                      {prev && <WowBadge current={w.clicks} previous={prev.clicks} />}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="text-[14px] text-[#1C2B33] tabular-nums">{w.ctr.toFixed(2)}%</div>
                      {prev && <WowBadge current={w.ctr} previous={prev.ctr} />}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="text-[14px] text-[#1C2B33] tabular-nums">{formatCurrency(w.cpc)}</div>
                      {prev && <WowBadge current={w.cpc} previous={prev.cpc} invert />}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="text-[14px] text-[#1C2B33] font-medium tabular-nums">{formatNumber(w.conversions)}</div>
                      {prev && <WowBadge current={w.conversions} previous={prev.conversions} />}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="text-[14px] text-[#1C2B33] tabular-nums">{w.roas.toFixed(2)}x</div>
                      {prev && <WowBadge current={w.roas} previous={prev.roas} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Current Week Cumulative Progress */}
      <div className="bg-white rounded-xl border border-[#E4E6EB] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E4E6EB] flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-[#1C2B33]">
              Current Week Progress
            </h3>
            <p className="text-[12px] text-[#8A8D91] mt-0.5">
              Cumulative totals — each row includes all previous days
            </p>
          </div>
          <button
            onClick={handleExportDaily}
            disabled={cumulativeDays.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CED0D4] bg-white text-[13px] font-medium text-[#1C2B33] hover:bg-[#F0F2F5] transition-colors disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
        {cumulativeDays.length === 0 ? (
          <div className="p-8 text-center text-[#8A8D91] text-sm">
            No data for this week yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-[#E4E6EB] bg-[#F8F9FA]">
                  <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Day</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Spend</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Impressions</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Clicks</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">CTR</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">CPC</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">Results</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] uppercase tracking-wide">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {cumulativeDays.map((d, i) => {
                  const isLatest = i === cumulativeDays.length - 1;
                  return (
                    <tr
                      key={d.date}
                      className={`border-b border-[#E4E6EB] last:border-0 ${isLatest ? "bg-[#EBF5FF]/40" : "hover:bg-[#F8F9FA]"}`}
                    >
                      <td className="px-4 py-3 text-[14px] text-[#1C2B33] font-medium whitespace-nowrap">
                        {d.dayLabel}
                        {isLatest && (
                          <span className="ml-2 text-[11px] text-[#1877F2] bg-[#EBF5FF] px-1.5 py-0.5 rounded">
                            Latest
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] font-medium tabular-nums">
                        {formatCurrency(d.spend)}
                      </td>
                      <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] tabular-nums">
                        {formatNumber(d.impressions)}
                      </td>
                      <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] tabular-nums">
                        {formatNumber(d.clicks)}
                      </td>
                      <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] tabular-nums">
                        {d.ctr.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] tabular-nums">
                        {formatCurrency(d.cpc)}
                      </td>
                      <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] font-medium tabular-nums">
                        {formatNumber(d.conversions)}
                      </td>
                      <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] tabular-nums">
                        {d.roas.toFixed(2)}x
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
