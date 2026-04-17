"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface AmazonDayMetrics {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  orders: number;
  sales: number;
  acos: number;
  roas: number;
}

interface WeekSummary {
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  orders: number;
  sales: number;
  acos: number;
  roas: number;
}

function getMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}
function fmtKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fmtShort(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function parseDate(s: string) { const [y,m,d] = s.split("-").map(Number); return new Date(y,m-1,d); }
function fmtCurrency(v: number) {
  if (v >= 100000) return `₹${(v/100000).toFixed(2)}L`;
  if (v >= 1000)   return `₹${(v/1000).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
}

function WowBadge({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
  if (!previous) return <span className="text-[12px] text-[#8A8D91] dark:text-[#616161]">—</span>;
  const pct = ((current - previous) / previous) * 100;
  const isGood = invert ? pct < 0 : pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[12px] font-medium ${isGood ? "text-[#31A24C]" : "text-[#E41E3F]"}`}>
      {pct > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

function Row({ label, thisWeek, prevWeek, fmt, invert }: {
  label: string; thisWeek: number; prevWeek: number;
  fmt: (v: number) => string; invert?: boolean;
}) {
  const dash = <span className="text-[#8A8D91] dark:text-[#616161]">—</span>;
  return (
    <tr className="border-b border-[#E4E6EB] dark:border-[#2a2a2a] last:border-0 hover:bg-[#F8F9FA] dark:hover:bg-[#1c1c1c]">
      <td className="px-4 py-3 text-[14px] text-[#1C2B33] dark:text-[#ededed] font-medium">{label}</td>
      <td className="px-4 py-3 text-right text-[14px] text-[#1C2B33] dark:text-[#ededed] tabular-nums font-medium">{thisWeek > 0 ? fmt(thisWeek) : dash}</td>
      <td className="px-4 py-3 text-right text-[14px] text-[#65676B] dark:text-[#888888] tabular-nums">{prevWeek > 0 ? fmt(prevWeek) : dash}</td>
      <td className="px-4 py-3 text-right">
        {thisWeek > 0 && prevWeek > 0 ? <WowBadge current={thisWeek} previous={prevWeek} invert={invert} /> : dash}
      </td>
    </tr>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <tr className="bg-[#F8F9FA] dark:bg-[#161616]">
        <td colSpan={4} className="px-4 py-2.5 text-[12px] font-bold text-[#FF9900] uppercase tracking-wide">{title}</td>
      </tr>
      {children}
    </>
  );
}

export function AmazonWeekly() {
  const [weeks, setWeeks]   = useState<WeekSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [numWeeks, setNumWeeks] = useState(5);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const now           = new Date();
      const currentMonday = getMonday(now);
      const startDate     = new Date(currentMonday);
      startDate.setDate(startDate.getDate() - (numWeeks - 1) * 7);

      const res  = await fetch(`/api/amazon/metrics?start_date=${fmtKey(startDate)}&end_date=${fmtKey(now)}`);
      if (cancelled) return;
      const data = await res.json();
      const daily: AmazonDayMetrics[] = data.daily || [];

      const weekMap = new Map<string, AmazonDayMetrics[]>();
      for (const d of daily) {
        const key = fmtKey(getMonday(parseDate(d.date)));
        if (!weekMap.has(key)) weekMap.set(key, []);
        weekMap.get(key)!.push(d);
      }

      const currentKey = fmtKey(currentMonday);
      let wNum = 1;
      const summaries = Array.from(weekMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mondayStr, days]) => {
          const isCurrent = mondayStr === currentKey;
          const monday    = parseDate(mondayStr);
          const sunday    = new Date(monday); sunday.setDate(sunday.getDate() + 6);
          const spend       = days.reduce((s, d) => s + d.spend, 0);
          const impressions = days.reduce((s, d) => s + d.impressions, 0);
          const clicks      = days.reduce((s, d) => s + d.clicks, 0);
          const orders      = days.reduce((s, d) => s + d.orders, 0);
          const sales       = days.reduce((s, d) => s + d.sales, 0);
          return {
            label: isCurrent ? "Current Week" : `Week ${wNum++}`,
            startDate: fmtShort(monday),
            endDate:   fmtShort(sunday),
            isCurrent,
            spend, impressions, clicks, orders, sales,
            ctr:  impressions > 0 ? (clicks / impressions) * 100 : 0,
            cpc:  clicks > 0 ? spend / clicks : 0,
            acos: sales > 0 ? (spend / sales) * 100 : 0,
            roas: spend > 0 ? sales / spend : 0,
          };
        });

      if (!cancelled) { setWeeks(summaries); setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [numWeeks]);

  const current  = weeks.find(w => w.isCurrent);
  const previous = weeks.length >= 2 ? weeks[weeks.length - 2] : null;
  const n = (v: number) => new Intl.NumberFormat("en-IN").format(v);
  const pct = (v: number) => `${v.toFixed(2)}%`;
  const roas = (v: number) => `${v.toFixed(2)}x`;

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold text-[#1C2B33] dark:text-[#ededed]">Amazon Ads — Weekly Report</h2>
          <p className="text-[13px] text-[#65676B] dark:text-[#888888] mt-0.5">Sponsored Products · Monday to Sunday</p>
        </div>
        <select
          value={numWeeks}
          onChange={e => setNumWeeks(Number(e.target.value))}
          className="appearance-none self-start sm:self-auto bg-white dark:bg-[#111111] border border-[#CED0D4] dark:border-[#2a2a2a] rounded-lg px-3 py-2 text-[14px] text-[#1C2B33] dark:text-[#ededed] font-medium cursor-pointer focus:outline-none focus:border-[#FF9900] focus:ring-1 focus:ring-[#FF9900] transition-colors"
        >
          <option value={5}>Last 5 weeks</option>
          <option value={8}>Last 8 weeks</option>
          <option value={12}>Last 12 weeks</option>
        </select>
      </div>

      {/* This week vs previous */}
      {current && previous && (
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E4E6EB] dark:border-[#2a2a2a]">
            <h3 className="text-[15px] font-semibold text-[#1C2B33] dark:text-[#ededed]">This Week vs Previous Week</h3>
            <p className="text-[12px] text-[#8A8D91] dark:text-[#616161] mt-0.5">
              {current.startDate} – today vs {previous.startDate} – {previous.endDate}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-[#E4E6EB] dark:border-[#2a2a2a]">
                  <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">Parameter</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">This Week</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">Prev Week</th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">WoW</th>
                </tr>
              </thead>
              <tbody>
                <Section title="Business Metrics">
                  <Row label="Total Sales (₹)"      thisWeek={current.sales}  prevWeek={previous.sales}  fmt={fmtCurrency} />
                  <Row label="Ad Spend (₹)"         thisWeek={current.spend}  prevWeek={previous.spend}  fmt={fmtCurrency} />
                  <Row label="ACOS (%)"             thisWeek={current.acos}   prevWeek={previous.acos}   fmt={pct} invert />
                  <Row label="ROAS"                 thisWeek={current.roas}   prevWeek={previous.roas}   fmt={roas} />
                  <Row label="Orders"               thisWeek={current.orders} prevWeek={previous.orders} fmt={n} />
                </Section>
                <Section title="Traffic Metrics">
                  <Row label="Impressions"          thisWeek={current.impressions} prevWeek={previous.impressions} fmt={n} />
                  <Row label="Clicks"               thisWeek={current.clicks}      prevWeek={previous.clicks}      fmt={n} />
                  <Row label="CTR (%)"              thisWeek={current.ctr}         prevWeek={previous.ctr}         fmt={pct} />
                  <Row label="CPC (₹)"              thisWeek={current.cpc}         prevWeek={previous.cpc}         fmt={fmtCurrency} invert />
                </Section>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No data state */}
      {!loading && weeks.length === 0 && (
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] p-12 text-center text-[13px] text-[#8A8D91] dark:text-[#616161]">
          No Amazon Ads data yet — data will appear once campaigns go live.
        </div>
      )}

      {/* Week-by-week table */}
      {weeks.length > 0 && (
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E4E6EB] dark:border-[#2a2a2a]">
            <h3 className="text-[15px] font-semibold text-[#1C2B33] dark:text-[#ededed]">Week-by-Week Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-[#E4E6EB] dark:border-[#2a2a2a] bg-[#F8F9FA] dark:bg-[#161616]">
                  {["Week","Period","Spend","Sales","ACOS","ROAS","Impressions","Clicks","CTR","Orders"].map(h => (
                    <th key={h} className={`px-4 py-3 text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide ${["Week","Period"].includes(h) ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((w, i) => {
                  const prev = i > 0 ? weeks[i - 1] : null;
                  const dash = <span className="text-[#8A8D91] dark:text-[#616161]">—</span>;
                  return (
                    <tr key={w.label} className={`border-b border-[#E4E6EB] dark:border-[#2a2a2a] last:border-0 ${w.isCurrent ? "bg-[#FFF8F0]/60 dark:bg-[#2a1a00]/20" : "hover:bg-[#F8F9FA] dark:hover:bg-[#1c1c1c]"}`}>
                      <td className="px-4 py-3.5">
                        <span className={`text-[14px] font-medium ${w.isCurrent ? "text-[#FF9900]" : "text-[#1C2B33] dark:text-[#ededed]"}`}>{w.label}</span>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-[#65676B] dark:text-[#888888] whitespace-nowrap">{w.startDate} – {w.endDate}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="text-[14px] text-[#1C2B33] dark:text-[#ededed] tabular-nums">{w.spend > 0 ? fmtCurrency(w.spend) : dash}</div>
                        {prev && w.spend > 0 && prev.spend > 0 && <WowBadge current={w.spend} previous={prev.spend} />}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="text-[14px] text-[#1C2B33] dark:text-[#ededed] tabular-nums">{w.sales > 0 ? fmtCurrency(w.sales) : dash}</div>
                        {prev && w.sales > 0 && prev.sales > 0 && <WowBadge current={w.sales} previous={prev.sales} />}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[14px] tabular-nums">
                        <span className={w.acos > 0 && w.acos < 30 ? "text-[#31A24C] font-medium" : w.acos >= 30 ? "text-[#E41E3F]" : "text-[#8A8D91] dark:text-[#616161]"}>
                          {w.acos > 0 ? `${w.acos.toFixed(1)}%` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-[14px] text-[#1C2B33] dark:text-[#ededed] tabular-nums">{w.roas > 0 ? `${w.roas.toFixed(2)}x` : dash}</td>
                      <td className="px-4 py-3.5 text-right text-[14px] text-[#1C2B33] dark:text-[#ededed] tabular-nums">{w.impressions > 0 ? n(w.impressions) : dash}</td>
                      <td className="px-4 py-3.5 text-right text-[14px] text-[#1C2B33] dark:text-[#ededed] tabular-nums">{w.clicks > 0 ? n(w.clicks) : dash}</td>
                      <td className="px-4 py-3.5 text-right text-[14px] text-[#1C2B33] dark:text-[#ededed] tabular-nums">{w.ctr > 0 ? `${w.ctr.toFixed(2)}%` : dash}</td>
                      <td className="px-4 py-3.5 text-right text-[14px] font-medium text-[#1C2B33] dark:text-[#ededed] tabular-nums">{w.orders > 0 ? n(w.orders) : dash}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
