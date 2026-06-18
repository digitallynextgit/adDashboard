"use client";

import { useEffect, useState } from "react";
import {
  RefreshCw, Sparkles, Loader2, TrendingUp, TrendingDown, Minus,
  AlertCircle, Search, MapPin, Layers, Users, Activity, FileText, Download,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// ----- Types (mirrored from src/lib/h2s/aggregate.ts) -----

interface MetricCell { current: number; prev: number; wow_pct: number | null }

interface Facts {
  generated_at: string;
  this_week:  { start: string; end: string };
  prev_week:  { start: string; end: string };
  headline: {
    revenue: MetricCell; orders: MetricCell; spend: MetricCell;
    blended_cac: MetricCell; blended_roas: MetricCell;
    prepaid_pct: MetricCell; rto_pct: MetricCell;
  };
  by_state: Array<{
    state: string; orders: number; revenue: number;
    prepaid_count: number; rto_count: number; is_primary: boolean;
    wow_revenue_pct: number | null;
  }>;
  by_channel: Array<{
    channel: string; spend: number; revenue: number; orders: number;
    roas: number; revenue_share_pct: number;
  }>;
  by_quadrant: Array<{
    quadrant: string; quadrant_label: string; spend: number; revenue: number;
    impressions: number; clicks: number; ctr: number; roas: number;
    spend_share_pct: number; campaign_count: number;
  }>;
  cohorts: Array<{
    cohort: string; customer_count: number; total_revenue: number;
    reorder_count: number; replacement_rate_pct: number;
  }>;
  funnel: {
    sessions: number; add_to_cart: number; initiate_checkout: number;
    purchases: number; rage_clicks: number; dead_clicks: number; js_errors: number;
    available: { ga4: boolean; clarity: boolean; gokwik: boolean };
  };
  top_queries: {
    converting: Array<{ query: string; clicks: number; position: number }>;
    gaps: Array<{ query: string; impressions: number; clicks: number; ctr: number }>;
    available: boolean;
  };
  anomalies: Array<{
    metric: string; magnitude: string; direction: "up" | "down";
    sigma: number; notes?: string;
  }>;
}

interface Report {
  week_start: string;
  week_end: string;
  markdown: string;
  model_used: string;
  generated_at: string;
  google_doc_url: string | null;
}

// ----- Format helpers -----

function fmtINR(n: number): string {
  if (!n && n !== 0) return "—";
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function fmtNum(n: number): string {
  if (!n && n !== 0) return "—";
  return n.toLocaleString("en-IN");
}

function fmtPct(n: number, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

function DeltaPill({ pct, invert }: { pct: number | null; invert?: boolean }) {
  if (pct === null || Number.isNaN(pct)) {
    return (
      <span className="inline-flex items-center gap-1 text-[#65676B] dark:text-[#888888] text-[12px]">
        <Minus className="h-3 w-3" /> —
      </span>
    );
  }
  const isUp = pct > 0;
  const goodUp = !invert;
  const isPositive = goodUp ? isUp : !isUp;
  const color = pct === 0 ? "#65676B" : isPositive ? "#31A24C" : "#E41E3F";
  const Icon = pct === 0 ? Minus : isUp ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color }}>
      <Icon className="h-3 w-3" />
      {isUp ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

// ----- Page -----

export default function H2SPage() {
  const [facts, setFacts]     = useState<Facts | null>(null);
  const [report, setReport]   = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]   = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [f, r] = await Promise.all([
        fetch("/api/h2s/dashboard").then((res) => res.json()),
        fetch("/api/h2s/latest-report").then((res) => res.json()),
      ]);
      if (!f.error) setFacts(f);
      if (r && !r.error) setReport(r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/h2s/generate-report", { method: "POST" });
      const json = await res.json();
      if (!res.ok || json.error) {
        const detail = json.details ? ` — ${json.details}` : "";
        setGenError((json.error ?? "Generation failed") + detail);
      } else {
        setReport(json.report);
      }
    } catch (e) {
      setGenError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  function handleDownloadMarkdown() {
    if (!report) return;
    const blob = new Blob([report.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `h2s-weekly-${report.week_start}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-300 mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold text-meta-dark dark:text-[#ededed]">
            H2S — Hard2Soft Pilot
          </h2>
          <p className="text-[13px] text-[#65676B] dark:text-[#888888] mt-0.5">
            {facts
              ? `Reporting window: ${facts.this_week.start} → ${facts.this_week.end}`
              : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            onClick={loadAll}
            disabled={loading}
            className="p-2 rounded-lg border border-[#CED0D4] dark:border-[#2a2a2a] bg-white dark:bg-[#111111] hover:bg-meta-sidebar dark:hover:bg-[#1c1c1c] transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 text-[#65676B] dark:text-[#888888] ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-meta-blue hover:bg-meta-blue-hover text-white text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              : <><Sparkles className="h-4 w-4" /> Generate Report</>}
          </button>
        </div>
      </div>

      {genError && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#FEF2F2] dark:bg-[#7F1D1D]/15 border border-[#FECACA] dark:border-[#7F1D1D]/40">
          <AlertCircle className="h-4 w-4 text-meta-red shrink-0 mt-0.5" />
          <p className="text-[12px] font-medium text-meta-red dark:text-[#F87171]">{genError}</p>
        </div>
      )}

      {!facts ? (
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] p-10 text-center text-[14px] text-[#65676B] dark:text-[#888888]">
          Loading H2S data…
        </div>
      ) : (
        <>
          {/* Panel 1 — Headline KPIs */}
          <section>
            <h3 className="text-[15px] font-semibold text-meta-dark dark:text-[#ededed] mb-2">
              Headline KPIs
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard label="Revenue" value={fmtINR(facts.headline.revenue.current)} delta={facts.headline.revenue.wow_pct} />
              <KpiCard label="Orders" value={fmtNum(facts.headline.orders.current)} delta={facts.headline.orders.wow_pct} />
              <KpiCard label="Spend" value={fmtINR(facts.headline.spend.current)} delta={facts.headline.spend.wow_pct} />
              <KpiCard label="Blended CAC" value={fmtINR(facts.headline.blended_cac.current)} delta={facts.headline.blended_cac.wow_pct} invertDelta />
              <KpiCard label="Blended ROAS" value={`${facts.headline.blended_roas.current.toFixed(2)}x`} delta={facts.headline.blended_roas.wow_pct} />
              <KpiCard label="Prepaid %" value={fmtPct(facts.headline.prepaid_pct.current)} delta={facts.headline.prepaid_pct.wow_pct} />
            </div>
          </section>

          {/* Panel 2 — ROAS by state */}
          <Panel icon={<MapPin className="h-4 w-4" />} title="By Geography (top primary states first)">
            {facts.by_state.length === 0 ? (
              <EmptyHint>No state-level data yet. Sync H2S state revenue or wait for first orders.</EmptyHint>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[#65676B] dark:text-[#888888] text-[12px] uppercase tracking-wide">
                      <th className="py-2 pr-3">State</th>
                      <th className="py-2 pr-3 text-right">Orders</th>
                      <th className="py-2 pr-3 text-right">Revenue</th>
                      <th className="py-2 pr-3 text-right">RTO</th>
                      <th className="py-2 pr-3 text-right">WoW %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facts.by_state.slice(0, 10).map((s) => (
                      <tr key={s.state} className="border-t border-[#E4E6EB] dark:border-[#2a2a2a]">
                        <td className="py-2 pr-3">
                          <span className={s.is_primary ? "font-semibold text-meta-blue" : "text-meta-dark dark:text-[#ededed]"}>
                            {s.state}
                          </span>
                          {s.is_primary && <span className="ml-1.5 text-[10px] text-[#65676B] dark:text-[#888888]">primary</span>}
                        </td>
                        <td className="py-2 pr-3 text-right text-meta-dark dark:text-[#ededed]">{fmtNum(s.orders)}</td>
                        <td className="py-2 pr-3 text-right text-meta-dark dark:text-[#ededed]">{fmtINR(s.revenue)}</td>
                        <td className="py-2 pr-3 text-right text-meta-dark dark:text-[#ededed]">{fmtNum(s.rto_count)}</td>
                        <td className="py-2 pr-3 text-right"><DeltaPill pct={s.wow_revenue_pct} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Panel 3 — Meta content quadrants */}
          <Panel icon={<Layers className="h-4 w-4" />} title="Meta Content Quadrants">
            {facts.by_quadrant.length === 0 ? (
              <EmptyHint>No tagged Meta campaigns yet. Add rows to <code>h2s_content_quadrants</code> to tag.</EmptyHint>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {facts.by_quadrant.map((q) => (
                  <div key={q.quadrant} className="rounded-lg border border-[#E4E6EB] dark:border-[#2a2a2a] p-3">
                    <p className="text-[12px] font-semibold text-[#65676B] dark:text-[#888888] truncate">{q.quadrant_label}</p>
                    <p className="text-[20px] font-bold text-meta-dark dark:text-[#ededed] mt-0.5">{q.roas.toFixed(2)}x</p>
                    <p className="text-[12px] text-[#65676B] dark:text-[#888888] mt-0.5">
                      {fmtINR(q.spend)} spend · {q.spend_share_pct.toFixed(0)}% share · {q.campaign_count} camp.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Panel 4 — LTV cohorts */}
          <Panel icon={<Users className="h-4 w-4" />} title="LTV Cohorts">
            {facts.cohorts.every((c) => c.customer_count === 0) ? (
              <EmptyHint>No cohort data yet. Run cohort assignment from Shopify customer history.</EmptyHint>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[#65676B] dark:text-[#888888] text-[12px] uppercase tracking-wide">
                      <th className="py-2 pr-3">Cohort</th>
                      <th className="py-2 pr-3 text-right">Customers</th>
                      <th className="py-2 pr-3 text-right">Revenue</th>
                      <th className="py-2 pr-3 text-right">Reorders</th>
                      <th className="py-2 pr-3 text-right">Replace %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facts.cohorts.map((c) => (
                      <tr key={c.cohort} className="border-t border-[#E4E6EB] dark:border-[#2a2a2a]">
                        <td className="py-2 pr-3 text-meta-dark dark:text-[#ededed]">{c.cohort.replaceAll("_", " ")}</td>
                        <td className="py-2 pr-3 text-right text-meta-dark dark:text-[#ededed]">{fmtNum(c.customer_count)}</td>
                        <td className="py-2 pr-3 text-right text-meta-dark dark:text-[#ededed]">{fmtINR(c.total_revenue)}</td>
                        <td className="py-2 pr-3 text-right text-meta-dark dark:text-[#ededed]">{fmtNum(c.reorder_count)}</td>
                        <td className="py-2 pr-3 text-right text-meta-dark dark:text-[#ededed]">{fmtPct(c.replacement_rate_pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Panel 5 — Funnel health */}
          <Panel icon={<Activity className="h-4 w-4" />} title="Funnel Health">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <FunnelStep label="Sessions"   value={fmtNum(facts.funnel.sessions)}     available={facts.funnel.available.ga4} />
              <FunnelStep label="Add to Cart" value={fmtNum(facts.funnel.add_to_cart)}  available />
              <FunnelStep label="Checkouts"  value={fmtNum(facts.funnel.initiate_checkout)} available />
              <FunnelStep label="Purchases"  value={fmtNum(facts.funnel.purchases)}    available />
            </div>
            <div className="grid grid-cols-3 gap-3 text-[12px] text-[#65676B] dark:text-[#888888]">
              <div>Rage clicks: <span className="font-semibold text-meta-dark dark:text-[#ededed]">{fmtNum(facts.funnel.rage_clicks)}</span></div>
              <div>Dead clicks: <span className="font-semibold text-meta-dark dark:text-[#ededed]">{fmtNum(facts.funnel.dead_clicks)}</span></div>
              <div>JS errors: <span className="font-semibold text-meta-dark dark:text-[#ededed]">{fmtNum(facts.funnel.js_errors)}</span></div>
            </div>
            {!facts.funnel.available.clarity && (
              <p className="text-[12px] text-[#8A8D91] dark:text-[#616161] mt-2 italic">
                Clarity not connected — only Meta/Shopify funnel signals shown.
              </p>
            )}
          </Panel>

          {/* Panel 6 — GSC search intent */}
          <Panel icon={<Search className="h-4 w-4" />} title="Search Intent (GSC)">
            {!facts.top_queries.available ? (
              <EmptyHint>No GSC data yet — integration pending.</EmptyHint>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <p className="text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase mb-2 tracking-wide">Top Converting</p>
                  <ul className="space-y-1.5">
                    {facts.top_queries.converting.slice(0, 10).map((q) => (
                      <li key={q.query} className="flex justify-between text-[13px]">
                        <span className="text-meta-dark dark:text-[#ededed] truncate pr-2">{q.query}</span>
                        <span className="text-[#65676B] dark:text-[#888888] whitespace-nowrap">
                          {fmtNum(q.clicks)} clicks · pos {q.position.toFixed(1)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#65676B] dark:text-[#888888] uppercase mb-2 tracking-wide">Content Gaps (high imp, no clicks)</p>
                  <ul className="space-y-1.5">
                    {facts.top_queries.gaps.slice(0, 10).map((q) => (
                      <li key={q.query} className="flex justify-between text-[13px]">
                        <span className="text-meta-dark dark:text-[#ededed] truncate pr-2">{q.query}</span>
                        <span className="text-[#65676B] dark:text-[#888888] whitespace-nowrap">{fmtNum(q.impressions)} imp</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Panel>

          {/* Panel 7 — Anomalies */}
          <Panel icon={<AlertCircle className="h-4 w-4" />} title="Anomalies">
            {facts.anomalies.length === 0 ? (
              <EmptyHint>No anomalies detected this week.</EmptyHint>
            ) : (
              <ul className="space-y-2">
                {facts.anomalies.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#FFFBEB] dark:bg-[#78350F]/15 border border-[#FDE68A] dark:border-[#78350F]/40">
                    <AlertCircle className="h-4 w-4 text-meta-orange shrink-0 mt-0.5" />
                    <div className="text-[13px]">
                      <p className="font-medium text-meta-dark dark:text-[#ededed]">
                        {a.metric} — {a.direction === "up" ? "↑" : "↓"} {a.magnitude}
                        {a.sigma !== 0 && <span className="ml-1 text-[12px] text-[#65676B] dark:text-[#888888]">({a.sigma}σ)</span>}
                      </p>
                      {a.notes && <p className="text-[12px] text-[#65676B] dark:text-[#888888] mt-0.5">{a.notes}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Panel 8 — Latest LLM report */}
          <Panel icon={<FileText className="h-4 w-4" />} title="Latest Weekly Report" right={
            report ? (
              <button
                onClick={handleDownloadMarkdown}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#CED0D4] dark:border-[#2a2a2a] bg-white dark:bg-[#111111] text-[12px] font-medium text-meta-dark dark:text-[#ededed] hover:bg-meta-sidebar dark:hover:bg-[#1c1c1c] transition-colors"
              >
                <Download className="h-3 w-3" /> Download .md
              </button>
            ) : null
          }>
            {!report ? (
              <EmptyHint>No report generated yet. Hit “Generate Report” above.</EmptyHint>
            ) : (
              <>
                <p className="text-[12px] text-[#65676B] dark:text-[#888888] mb-3">
                  Generated {new Date(report.generated_at).toLocaleString("en-IN")} · model: {report.model_used}
                </p>
                <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] text-meta-dark dark:text-[#ededed]">
                  <ReactMarkdown>{report.markdown}</ReactMarkdown>
                </div>
              </>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

// ----- Sub-components -----

function KpiCard({ label, value, delta, invertDelta }: { label: string; value: string; delta: number | null; invertDelta?: boolean }) {
  return (
    <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] p-3 sm:p-4">
      <p className="text-[12px] font-medium text-[#65676B] dark:text-[#888888]">{label}</p>
      <p className="text-[20px] font-bold text-meta-dark dark:text-[#ededed] tracking-tight mt-0.5">{value}</p>
      <div className="mt-1.5"><DeltaPill pct={delta} invert={invertDelta} /></div>
    </div>
  );
}

function Panel({ icon, title, right, children }: { icon: React.ReactNode; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-meta-dark dark:text-[#ededed]">
          {icon}
          <h3 className="text-[15px] font-semibold">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] text-[#65676B] dark:text-[#888888] italic">{children}</p>
  );
}

function FunnelStep({ label, value, available }: { label: string; value: string; available: boolean }) {
  return (
    <div className="rounded-lg border border-[#E4E6EB] dark:border-[#2a2a2a] p-3">
      <p className="text-[11px] font-semibold text-[#65676B] dark:text-[#888888] uppercase tracking-wide">{label}</p>
      <p className="text-[18px] font-bold text-meta-dark dark:text-[#ededed] mt-0.5">
        {available ? value : "—"}
      </p>
    </div>
  );
}
