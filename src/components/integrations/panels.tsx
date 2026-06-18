"use client";

import { AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Digest } from "@/lib/integrations";
import { TrendLineChart, TrendBarChart } from "./charts";

// Small WoW-style delta pill. `invert` flips colors (for cost-type metrics).
export function DeltaPill({ pct, invert }: { pct: number | null; invert?: boolean }) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-[#8A8D91] dark:text-[#616161]">
        <Minus className="h-3 w-3" /> —
      </span>
    );
  }
  const up = pct > 0;
  const positive = invert ? !up : up;
  const color = pct === 0 ? "#65676B" : positive ? "#31A24C" : "#E41E3F";
  const Icon = pct === 0 ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium" style={{ color }}>
      <Icon className="h-3 w-3" />{up ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

// ----- Reusable chart-pair component -----

function ChartPair({
  series,
  lineKey, lineLabel, lineColor, linePrefix,
  barKey, barLabel, barColor, barPrefix,
  lineTitle, lineSubtitle, barTitle, barSubtitle,
}: {
  series: Array<Record<string, number | string>>;
  lineKey: string; lineLabel: string; lineColor: string; linePrefix?: string;
  barKey: string;  barLabel: string;  barColor: string;  barPrefix?: string;
  lineTitle: string; lineSubtitle: string;
  barTitle: string;  barSubtitle: string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <TrendLineChart
        title={lineTitle} subtitle={lineSubtitle}
        data={series} dataKey={lineKey} color={lineColor}
        valueLabel={lineLabel} prefix={linePrefix}
      />
      <TrendBarChart
        title={barTitle} subtitle={barSubtitle}
        data={series} dataKey={barKey} color={barColor}
        valueLabel={barLabel} prefix={barPrefix}
      />
    </div>
  );
}

// ----- Format helpers (exported in case dashboards reuse) -----

export function fmtINR(n: number): string {
  if (!n && n !== 0) return "—";
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}
export function fmtNum(n: number): string { if (!n && n !== 0) return "—"; return n.toLocaleString("en-IN"); }
export function fmtPct(n: number, d = 1): string { if (n === null || n === undefined || Number.isNaN(n)) return "—"; return `${n.toFixed(d)}%`; }

// ----- Shared sub-components -----

export function StatusBanner({ status }: { status: "connected" | "pending" }) {
  const connected = status === "connected";
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[13px] font-medium ${
      connected
        ? "bg-[#ECFDF5] dark:bg-[#064E3B]/15 border-[#A7F3D0] dark:border-[#064E3B]/40 text-meta-green"
        : "bg-[#FFFBEB] dark:bg-[#78350F]/15 border-[#FDE68A] dark:border-[#78350F]/40 text-meta-orange"
    }`}>
      {connected
        ? <span className="w-2 h-2 rounded-full bg-meta-green shrink-0" />
        : <AlertCircle className="h-4 w-4 shrink-0" />}
      {connected ? "Connected · receiving data" : "Pending — credentials not configured or no data yet"}
    </div>
  );
}

export function Kpi({ label, value, hint, delta, invertDelta }: { label: string; value: string; hint?: string; delta?: number | null; invertDelta?: boolean }) {
  return (
    <div className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] p-3 sm:p-4">
      <p className="text-[12px] font-medium text-[#65676B] dark:text-[#888888]">{label}</p>
      <p className="text-[20px] font-bold text-meta-dark dark:text-[#ededed] tracking-tight mt-0.5">{value}</p>
      {delta !== undefined ? (
        <div className="mt-1 flex items-center gap-1.5">
          <DeltaPill pct={delta} invert={invertDelta} />
          <span className="text-[11px] text-[#8A8D91] dark:text-[#616161]">vs prev</span>
        </div>
      ) : hint ? (
        <p className="text-[11px] text-[#8A8D91] dark:text-[#616161] mt-0.5">{hint}</p>
      ) : null}
    </div>
  );
}

export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-[#111111] rounded-xl border border-[#E4E6EB] dark:border-[#2a2a2a] p-4 sm:p-5">
      <div className="mb-3">
        <h3 className="text-[15px] font-semibold text-meta-dark dark:text-[#ededed]">{title}</h3>
        {subtitle && <p className="text-[12px] text-[#65676B] dark:text-[#888888] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-[#65676B] dark:text-[#888888] italic">{children}</p>;
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" | "left" }) {
  return <th className={`py-2 pr-3 text-[12px] uppercase tracking-wide text-[#65676B] dark:text-[#888888] ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}

function Td({ children, align }: { children: React.ReactNode; align?: "right" | "left" }) {
  return <td className={`py-2 pr-3 text-[13px] text-meta-dark dark:text-[#ededed] ${align === "right" ? "text-right" : "text-left"}`}>{children}</td>;
}

// ============================================================================
// PANELS — one per service
// ============================================================================

export function MetaPanel({ d }: { d: Digest["meta"] }) {
  return (
    <div className="space-y-4">
      <StatusBanner status={d.status} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <Kpi label="Spend"       value={fmtINR(d.totals.spend)} />
        <Kpi label="Impressions" value={fmtNum(d.totals.impressions)} />
        <Kpi label="Clicks"      value={fmtNum(d.totals.clicks)} />
        <Kpi label="CTR"         value={fmtPct(d.totals.ctr, 2)} />
        <Kpi label="CPC"         value={fmtINR(d.totals.cpc)} />
        <Kpi label="Purchases"   value={fmtNum(d.totals.purchases)} />
        <Kpi label="ROAS"        value={`${(d.totals.roas || 0).toFixed(2)}x`} hint={fmtINR(d.totals.revenue) + " revenue"} />
      </div>

      <ChartPair
        series={d.daily}
        lineKey="spend"     lineLabel="Spend"     lineColor="#1877F2" linePrefix="₹"
        barKey="purchases"  barLabel="Purchases"  barColor="#1877F2"
        lineTitle="Amount Spent"   lineSubtitle="Daily spend trend"
        barTitle="Purchases"       barSubtitle="Daily purchase volume"
      />

      <Section title="Top campaigns" subtitle="Sorted by spend">
        {d.top_campaigns.length === 0 ? (
          <EmptyRow>No Meta campaign data in window.</EmptyRow>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <Th>Campaign</Th><Th>Status</Th>
                <Th align="right">Spend</Th><Th align="right">Imp.</Th>
                <Th align="right">Clicks</Th><Th align="right">Purchases</Th>
                <Th align="right">Revenue</Th><Th align="right">ROAS</Th>
              </tr></thead>
              <tbody>
                {d.top_campaigns.map((c) => (
                  <tr key={c.campaign_id} className="border-t border-[#E4E6EB] dark:border-[#2a2a2a]">
                    <Td>{c.name}</Td>
                    <Td><span className="text-[12px] text-[#65676B] dark:text-[#888888]">{c.status}</span></Td>
                    <Td align="right">{fmtINR(c.spend)}</Td>
                    <Td align="right">{fmtNum(c.impressions)}</Td>
                    <Td align="right">{fmtNum(c.clicks)}</Td>
                    <Td align="right">{fmtNum(c.purchases)}</Td>
                    <Td align="right">{fmtINR(c.purchase_value)}</Td>
                    <Td align="right">{c.spend > 0 ? `${(c.purchase_value / c.spend).toFixed(2)}x` : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Top regions" subtitle="Meta audience breakdown by Indian region">
        {d.regions.length === 0 ? (
          <EmptyRow>No region breakdown data yet.</EmptyRow>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <Th>Region</Th>
                <Th align="right">Spend</Th><Th align="right">Impressions</Th>
                <Th align="right">Purchases</Th><Th align="right">Revenue</Th>
              </tr></thead>
              <tbody>
                {d.regions.map((r) => (
                  <tr key={r.region} className="border-t border-[#E4E6EB] dark:border-[#2a2a2a]">
                    <Td>{r.region}</Td>
                    <Td align="right">{fmtINR(r.spend)}</Td>
                    <Td align="right">{fmtNum(r.impressions)}</Td>
                    <Td align="right">{fmtNum(r.purchases)}</Td>
                    <Td align="right">{fmtINR(r.purchase_value)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

export function ShopifyPanel({ d }: { d: Digest["shopify"] }) {
  const b = d.breakdown;
  const channelTotal = d.by_channel.reduce((a, c) => a + c.revenue, 0);
  return (
    <div className="space-y-4">
      <StatusBanner status={d.status} />

      {/* KPI row — with vs-previous-period deltas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <Kpi label="Gross sales"   value={fmtINR(d.totals.gross_sales)}  delta={d.deltas.gross_sales} />
        <Kpi label="Net sales"     value={fmtINR(d.totals.net_sales)}    delta={d.deltas.net_sales} />
        <Kpi label="Total sales"   value={fmtINR(d.totals.total_sales)}  delta={d.deltas.total_sales} />
        <Kpi label="Orders"        value={fmtNum(d.totals.orders)}       delta={d.deltas.orders} />
        <Kpi label="AOV"           value={fmtINR(d.totals.aov)}          delta={d.deltas.aov} />
        <Kpi label="Returning %"   value={fmtPct(d.totals.returning_rate)} delta={d.deltas.returning_rate} />
        <Kpi label="Units sold"    value={fmtNum(d.totals.units)} />
      </div>

      {/* Charts: total sales trend + AOV trend */}
      <ChartPair
        series={d.daily}
        lineKey="total_sales" lineLabel="Total sales" lineColor="#96BF47" linePrefix="₹"
        barKey="orders"       barLabel="Orders"       barColor="#96BF47"
        lineTitle="Total sales over time" lineSubtitle="Daily total sales"
        barTitle="Orders over time"       barSubtitle="Daily order count"
      />
      <ChartPair
        series={d.daily}
        lineKey="aov"   lineLabel="AOV"         lineColor="#5E8E3E" linePrefix="₹"
        barKey="total_sales" barLabel="Total sales" barColor="#5E8E3E" barPrefix="₹"
        lineTitle="Average order value" lineSubtitle="Daily AOV trend"
        barTitle="Total sales"          barSubtitle="Daily total sales (bars)"
      />

      {/* Sales breakdown + Channel split side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Total sales breakdown" subtitle="How gross sales become total sales">
          <div className="space-y-1.5 text-[13px]">
            <BreakdownRow label="Gross sales"    value={fmtINR(b.gross_sales)} />
            <BreakdownRow label="Discounts"      value={`−${fmtINR(b.discounts)}`} muted />
            <BreakdownRow label="Returns"        value={`−${fmtINR(b.returns)}`} muted />
            <BreakdownRow label="Net sales"      value={fmtINR(b.net_sales)} strong />
            <BreakdownRow label="Shipping"       value={`+${fmtINR(b.shipping)}`} muted />
            <BreakdownRow label="Taxes"          value={`+${fmtINR(b.taxes)}`} muted />
            <div className="border-t border-[#E4E6EB] dark:border-[#2a2a2a] pt-1.5 mt-1.5">
              <BreakdownRow label="Total sales"  value={fmtINR(b.total_sales)} strong />
            </div>
          </div>
        </Section>

        <Section title="Sales by channel" subtitle="By order source">
          {d.by_channel.length === 0 ? (
            <EmptyRow>No channel data in window.</EmptyRow>
          ) : (
            <div className="space-y-2.5">
              {d.by_channel.map((c) => {
                const pct = channelTotal > 0 ? (c.revenue / channelTotal) * 100 : 0;
                return (
                  <div key={c.channel}>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span className="text-meta-dark dark:text-[#ededed] truncate pr-2">{c.channel}</span>
                      <span className="text-[#65676B] dark:text-[#888888] whitespace-nowrap">
                        {fmtINR(c.revenue)} · {fmtNum(c.orders)} ord
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#E4E6EB] dark:bg-[#2a2a2a] overflow-hidden">
                      <div className="h-full rounded-full bg-[#96BF47]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {/* Sales by referrer */}
      <Section title="Sales by referrer" subtitle="By the site that referred the order (host of referring URL)">
        {d.by_referrer.length === 0 ? (
          <EmptyRow>No referrer data yet — run migration 011 + re-sync (most orders may be &quot;direct&quot;).</EmptyRow>
        ) : (
          <div className="space-y-2.5">
            {(() => {
              const refTotal = d.by_referrer.reduce((a, r) => a + r.revenue, 0);
              return d.by_referrer.map((r) => {
                const pct = refTotal > 0 ? (r.revenue / refTotal) * 100 : 0;
                return (
                  <div key={r.referrer}>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span className="text-meta-dark dark:text-[#ededed] truncate pr-2">{r.referrer}</span>
                      <span className="text-[#65676B] dark:text-[#888888] whitespace-nowrap">
                        {fmtINR(r.revenue)} · {fmtNum(r.orders)} ord
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#E4E6EB] dark:bg-[#2a2a2a] overflow-hidden">
                      <div className="h-full rounded-full bg-meta-blue" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </Section>

      {/* Top SKUs */}
      <Section title="Top products" subtitle="Sorted by revenue">
        {d.top_skus.length === 0 ? (
          <EmptyRow>No Shopify sales data in window.</EmptyRow>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <Th>Product</Th><Th>Variant</Th><Th>SKU</Th>
                <Th align="right">Orders</Th><Th align="right">Units</Th><Th align="right">Revenue</Th>
              </tr></thead>
              <tbody>
                {d.top_skus.map((s) => (
                  <tr key={s.sku + s.variant} className="border-t border-[#E4E6EB] dark:border-[#2a2a2a]">
                    <Td>{s.product}</Td>
                    <Td><span className="text-[12px] text-[#65676B] dark:text-[#888888]">{s.variant || "—"}</span></Td>
                    <Td><code className="text-[12px]">{s.sku || "—"}</code></Td>
                    <Td align="right">{fmtNum(s.orders)}</Td>
                    <Td align="right">{fmtNum(s.units)}</Td>
                    <Td align="right">{fmtINR(s.revenue)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Customer cohorts */}
      <Section title="Customer cohorts" subtitle="Grouped by first-order month · repeat rate = customers with 2+ orders">
        {d.cohorts.length === 0 ? (
          <EmptyRow>No customer data yet — requires the <code>read_customers</code> scope on the Shopify app.</EmptyRow>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <Th>Cohort month</Th>
                <Th align="right">New customers</Th>
                <Th align="right">Repeat customers</Th>
                <Th align="right">Repeat rate</Th>
                <Th align="right">Lifetime revenue</Th>
              </tr></thead>
              <tbody>
                {d.cohorts.map((c) => (
                  <tr key={c.month} className="border-t border-[#E4E6EB] dark:border-[#2a2a2a]">
                    <Td>{c.month}</Td>
                    <Td align="right">{fmtNum(c.customers)}</Td>
                    <Td align="right">{fmtNum(c.repeat_customers)}</Td>
                    <Td align="right">{fmtPct(c.repeat_rate)}</Td>
                    <Td align="right">{fmtINR(c.revenue)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function BreakdownRow({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-[#8A8D91] dark:text-[#616161]" : strong ? "font-semibold text-meta-dark dark:text-[#ededed]" : "text-meta-dark dark:text-[#ededed]"}>
        {label}
      </span>
      <span className={strong ? "font-semibold text-meta-dark dark:text-[#ededed]" : muted ? "text-[#8A8D91] dark:text-[#616161]" : "text-meta-dark dark:text-[#ededed]"}>
        {value}
      </span>
    </div>
  );
}

export function AmazonPanel({ d }: { d: Digest["amazon"] }) {
  return (
    <div className="space-y-4">
      <StatusBanner status={d.status} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <Kpi label="Spend"       value={fmtINR(d.totals.spend)} />
        <Kpi label="Impressions" value={fmtNum(d.totals.impressions)} />
        <Kpi label="Clicks"      value={fmtNum(d.totals.clicks)} />
        <Kpi label="CTR"         value={fmtPct(d.totals.ctr, 2)} />
        <Kpi label="Orders"      value={fmtNum(d.totals.orders)} />
        <Kpi label="Revenue"     value={fmtINR(d.totals.revenue)} />
        <Kpi label="ROAS / ACoS" value={`${(d.totals.roas || 0).toFixed(2)}x`} hint={`ACoS ${fmtPct(d.totals.acos, 1)}`} />
      </div>

      <ChartPair
        series={d.daily}
        lineKey="spend"  lineLabel="Spend"  lineColor="#FF9900" linePrefix="₹"
        barKey="orders"  barLabel="Orders"  barColor="#FF9900"
        lineTitle="Amount Spent" lineSubtitle="Daily Amazon Ads spend"
        barTitle="Orders"        barSubtitle="Daily orders attributed"
      />

      <Section title="Amazon campaigns" subtitle="Data populates once OAuth refresh token is configured (run scripts/amazon_auth.py)">
        <EmptyRow>Campaign list will appear after first sync. Required env: AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, AMAZON_REFRESH_TOKEN, AMAZON_PROFILE_ID.</EmptyRow>
      </Section>
    </div>
  );
}

export function FlipkartPanel({ d }: { d: Digest["flipkart"] }) {
  return (
    <div className="space-y-4">
      <StatusBanner status={d.status} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Spend"       value={fmtINR(d.totals.spend)} />
        <Kpi label="Impressions" value={fmtNum(d.totals.impressions)} />
        <Kpi label="Clicks"      value={fmtNum(d.totals.clicks)} />
        <Kpi label="Orders"      value={fmtNum(d.totals.orders)} />
        <Kpi label="Revenue"     value={fmtINR(d.totals.revenue)} />
        <Kpi label="ROAS"        value={`${(d.totals.roas || 0).toFixed(2)}x`} />
      </div>

      <ChartPair
        series={d.daily}
        lineKey="spend"  lineLabel="Spend"  lineColor="#2874F0" linePrefix="₹"
        barKey="orders"  barLabel="Orders"  barColor="#2874F0"
        lineTitle="Amount Spent" lineSubtitle="Daily Flipkart Ads spend"
        barTitle="Orders"        barSubtitle="Daily orders"
      />

      <Section title="Flipkart campaigns (PLA / PCA)" subtitle="Sync runs every 6h via GitHub Actions">
        {d.campaigns.length === 0 ? (
          <EmptyRow>No campaigns synced yet. Required env: FLIPKART_CLIENT_ID, FLIPKART_CLIENT_SECRET.</EmptyRow>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <Th>Campaign</Th><Th>Type</Th><Th>Status</Th><Th align="right">Daily budget</Th>
              </tr></thead>
              <tbody>
                {d.campaigns.slice(0, 20).map((c) => (
                  <tr key={c.campaign_id} className="border-t border-[#E4E6EB] dark:border-[#2a2a2a]">
                    <Td>{c.campaign_name}</Td>
                    <Td>{c.campaign_type || "—"}</Td>
                    <Td>{c.status}</Td>
                    <Td align="right">{fmtINR(Number(c.daily_budget))}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

export function Ga4Panel({ d }: { d: Digest["ga4"] }) {
  return (
    <div className="space-y-4">
      <StatusBanner status={d.status} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Sessions"        value={fmtNum(d.totals.sessions)} />
        <Kpi label="Users"           value={fmtNum(d.totals.users)} />
        <Kpi label="New users"       value={fmtNum(d.totals.new_users)} />
        <Kpi label="Engaged sess."   value={fmtNum(d.totals.engaged_sessions)} hint={fmtPct(d.totals.engagement_rate)} />
        <Kpi label="Conversions"     value={fmtNum(d.totals.conversions)}     hint={fmtPct(d.totals.conversion_rate) + " conv. rate"} />
        <Kpi label="Revenue"         value={fmtINR(d.totals.revenue)} />
      </div>

      <ChartPair
        series={d.daily}
        lineKey="sessions"    lineLabel="Sessions"    lineColor="#F4B400"
        barKey="conversions"  barLabel="Conversions"  barColor="#F4B400"
        lineTitle="Sessions"     lineSubtitle="Daily session count"
        barTitle="Conversions"   barSubtitle="Daily conversion events"
      />

      <Section title="Sessions by state" subtitle="Indian state codes (TN/GJ/AP/MH/TG/PY are H2S primary)">
        {d.by_state.length === 0 ? (
          <EmptyRow>No GA4 data yet — needs GA4_PROPERTY_ID + service account JSON.</EmptyRow>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <Th>State</Th>
                <Th align="right">Sessions</Th><Th align="right">Conversions</Th><Th align="right">Revenue</Th>
              </tr></thead>
              <tbody>
                {d.by_state.map((r) => (
                  <tr key={r.state} className="border-t border-[#E4E6EB] dark:border-[#2a2a2a]">
                    <Td>{r.state}</Td>
                    <Td align="right">{fmtNum(r.sessions)}</Td>
                    <Td align="right">{fmtNum(r.conversions)}</Td>
                    <Td align="right">{fmtINR(r.revenue)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Sessions by traffic source">
        {d.by_source.length === 0 ? (
          <EmptyRow>No traffic source breakdown yet.</EmptyRow>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <Th>Source</Th>
                <Th align="right">Sessions</Th><Th align="right">Conversions</Th><Th align="right">Revenue</Th>
              </tr></thead>
              <tbody>
                {d.by_source.map((r) => (
                  <tr key={r.source} className="border-t border-[#E4E6EB] dark:border-[#2a2a2a]">
                    <Td>{r.source}</Td>
                    <Td align="right">{fmtNum(r.sessions)}</Td>
                    <Td align="right">{fmtNum(r.conversions)}</Td>
                    <Td align="right">{fmtINR(r.revenue)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

export function GscPanel({ d }: { d: Digest["gsc"] }) {
  return (
    <div className="space-y-4">
      <StatusBanner status={d.status} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Impressions" value={fmtNum(d.totals.impressions)} />
        <Kpi label="Clicks"      value={fmtNum(d.totals.clicks)} />
        <Kpi label="CTR"         value={fmtPct(d.totals.ctr, 2)} />
        <Kpi label="Avg position" value={(d.totals.avg_position || 0).toFixed(1)} />
      </div>

      <ChartPair
        series={d.daily}
        lineKey="impressions" lineLabel="Impressions" lineColor="#4285F4"
        barKey="clicks"       barLabel="Clicks"       barColor="#4285F4"
        lineTitle="Impressions" lineSubtitle="Daily search impressions"
        barTitle="Clicks"       barSubtitle="Daily clicks from search"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Top converting queries" subtitle="Highest clicks in window">
          {d.top_converting.length === 0 ? (
            <EmptyRow>No GSC data yet — needs GSC_SITE_URL + GA4 service account access.</EmptyRow>
          ) : (
            <ul className="space-y-1.5">
              {d.top_converting.map((q) => (
                <li key={q.query} className="flex justify-between text-[13px]">
                  <span className="text-meta-dark dark:text-[#ededed] truncate pr-2">{q.query}</span>
                  <span className="text-[#65676B] dark:text-[#888888] whitespace-nowrap">
                    {fmtNum(q.clicks)} clicks · pos {(q.position ?? 0).toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Content gaps" subtitle="High impressions, 0 clicks (ranking but not winning)">
          {d.content_gaps.length === 0 ? (
            <EmptyRow>No content gaps detected.</EmptyRow>
          ) : (
            <ul className="space-y-1.5">
              {d.content_gaps.map((q) => (
                <li key={q.query} className="flex justify-between text-[13px]">
                  <span className="text-meta-dark dark:text-[#ededed] truncate pr-2">{q.query}</span>
                  <span className="text-[#65676B] dark:text-[#888888] whitespace-nowrap">{fmtNum(q.impressions)} imp</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

export function ClarityPanel({ d }: { d: Digest["clarity"] }) {
  return (
    <div className="space-y-4">
      <StatusBanner status={d.status} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <Kpi label="Sessions"      value={fmtNum(d.totals.sessions)} />
        <Kpi label="Rage clicks"   value={fmtNum(d.totals.rage_clicks)} />
        <Kpi label="Dead clicks"   value={fmtNum(d.totals.dead_clicks)} />
        <Kpi label="Quick back"    value={fmtNum(d.totals.quick_back)} />
        <Kpi label="JS errors"     value={fmtNum(d.totals.js_errors)} />
        <Kpi label="Avg scroll"    value={`${(d.totals.scroll_depth || 0).toFixed(1)}%`} />
        <Kpi label="Frustration %" value={fmtPct(d.totals.frustration_rate, 2)} />
      </div>

      <ChartPair
        series={d.daily_series}
        lineKey="sessions"     lineLabel="Sessions"      lineColor="#7B2D8E"
        barKey="frustrations"  barLabel="Rage + Dead clicks" barColor="#7B2D8E"
        lineTitle="Sessions"     lineSubtitle="Daily Clarity sessions"
        barTitle="Frustrations"  barSubtitle="Rage + dead clicks per day"
      />

      <Section title="Daily trend (last 14 rows)" subtitle="API exposes aggregates only; heatmaps + recordings remain in Clarity dashboard">
        {d.daily.length === 0 ? (
          <EmptyRow>No Clarity data yet — needs CLARITY_PROJECT_ID + CLARITY_API_TOKEN.</EmptyRow>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <Th>Date</Th>
                <Th align="right">Sessions</Th>
                <Th align="right">Rage</Th>
                <Th align="right">Dead</Th>
                <Th align="right">Quick back</Th>
                <Th align="right">JS errors</Th>
                <Th align="right">Scroll %</Th>
              </tr></thead>
              <tbody>
                {d.daily.map((r) => (
                  <tr key={r.date} className="border-t border-[#E4E6EB] dark:border-[#2a2a2a]">
                    <Td>{r.date}</Td>
                    <Td align="right">{fmtNum(r.sessions)}</Td>
                    <Td align="right">{fmtNum(r.rage_clicks)}</Td>
                    <Td align="right">{fmtNum(r.dead_clicks)}</Td>
                    <Td align="right">{fmtNum(r.quick_back)}</Td>
                    <Td align="right">{fmtNum(r.js_errors)}</Td>
                    <Td align="right">{Number(r.scroll_depth).toFixed(1)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

export function GokwikPanel({ d }: { d: Digest["gokwik"] }) {
  return (
    <div className="space-y-4">
      <StatusBanner status={d.status} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Checkouts started"   value={fmtNum(d.totals.checkouts_started)} />
        <Kpi label="Checkouts complete"  value={fmtNum(d.totals.checkouts_complete)} hint={fmtPct(d.totals.checkout_completion) + " completion"} />
        <Kpi label="Prepaid orders"      value={fmtNum(d.totals.prepaid_orders)}     hint={fmtPct(d.totals.prepaid_pct) + " of orders"} />
        <Kpi label="COD orders"          value={fmtNum(d.totals.cod_orders)} />
        <Kpi label="RTO orders"          value={fmtNum(d.totals.rto_orders)}         hint={fmtPct(d.totals.rto_pct) + " RTO rate"} />
        <Kpi label="Revenue"             value={fmtINR(d.totals.revenue)} />
      </div>

      <ChartPair
        series={d.daily}
        lineKey="revenue" lineLabel="Revenue"   lineColor="#FF4D4F" linePrefix="₹"
        barKey="rto"      barLabel="RTO orders" barColor="#FF4D4F"
        lineTitle="Revenue"      lineSubtitle="Daily GoKwik checkout revenue"
        barTitle="RTO orders"    barSubtitle="Daily return-to-origin volume"
      />

      <Section title="Top states by revenue">
        {d.by_state.length === 0 ? (
          <EmptyRow>No GoKwik data yet — needs GOKWIK_API_KEY + GOKWIK_MERCHANT_ID.</EmptyRow>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <Th>State</Th>
                <Th align="right">Prepaid</Th><Th align="right">COD</Th><Th align="right">RTO</Th><Th align="right">Revenue</Th>
              </tr></thead>
              <tbody>
                {d.by_state.map((r) => (
                  <tr key={r.state} className="border-t border-[#E4E6EB] dark:border-[#2a2a2a]">
                    <Td>{r.state}</Td>
                    <Td align="right">{fmtNum(r.prepaid)}</Td>
                    <Td align="right">{fmtNum(r.cod)}</Td>
                    <Td align="right">{fmtNum(r.rto)}</Td>
                    <Td align="right">{fmtINR(r.revenue)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Top pincodes by order volume">
        {d.by_pincode.length === 0 ? (
          <EmptyRow>No pincode data yet.</EmptyRow>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <Th>Pincode</Th>
                <Th align="right">Prepaid</Th><Th align="right">COD</Th><Th align="right">RTO</Th>
              </tr></thead>
              <tbody>
                {d.by_pincode.map((r) => (
                  <tr key={r.pincode} className="border-t border-[#E4E6EB] dark:border-[#2a2a2a]">
                    <Td><code className="text-[12px]">{r.pincode}</code></Td>
                    <Td align="right">{fmtNum(r.prepaid)}</Td>
                    <Td align="right">{fmtNum(r.cod)}</Td>
                    <Td align="right">{fmtNum(r.rto)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
