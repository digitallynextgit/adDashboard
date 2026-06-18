/**
 * Shared service metadata + types for the /integrations area.
 * Imported by both the sidebar (navigation) and the integration pages.
 */

export type ServiceId =
  | "meta" | "shopify" | "amazon" | "flipkart"
  | "ga4" | "gsc" | "clarity" | "gokwik";

export interface ServiceMeta {
  id: ServiceId;
  label: string;
  short: string;       // sidebar label (truncated)
  initial: string;     // 1-2 char chip
  color: string;
  description: string;
}

export const SERVICES: ServiceMeta[] = [
  { id: "meta",     label: "Meta Ads",         short: "Meta",     initial: "M",  color: "#1877F2", description: "Facebook & Instagram campaign performance" },
  { id: "shopify",  label: "Shopify",          short: "Shopify",  initial: "S",  color: "#96BF47", description: "Orders, revenue, SKU performance" },
  { id: "amazon",   label: "Amazon Ads",       short: "Amazon",   initial: "A",  color: "#FF9900", description: "Sponsored Products campaigns" },
  { id: "flipkart", label: "Flipkart Ads",     short: "Flipkart", initial: "F",  color: "#2874F0", description: "PLA & PCA campaigns" },
  { id: "ga4",      label: "Google Analytics", short: "GA4",      initial: "G",  color: "#F4B400", description: "Sessions, conversions, state breakdown" },
  { id: "gsc",      label: "Search Console",   short: "GSC",      initial: "C",  color: "#4285F4", description: "Query performance + content gaps" },
  { id: "clarity",  label: "MS Clarity",       short: "Clarity",  initial: "Cl", color: "#7B2D8E", description: "Rage clicks, dead clicks, JS errors" },
  { id: "gokwik",   label: "GoKwik",           short: "GoKwik",   initial: "K",  color: "#FF4D4F", description: "Checkout, prepaid/COD, RTO by pincode" },
];

export function getService(id: string): ServiceMeta | undefined {
  return SERVICES.find((s) => s.id === id);
}

// ----- Digest shape returned by /api/integrations -----

export interface Status { status: "connected" | "pending" }

export interface TopCampaign  { campaign_id: string; name: string; status: string; spend: number; impressions: number; clicks: number; purchases: number; purchase_value: number }
export interface RegionRow    { region: string; spend: number; impressions: number; purchases: number; purchase_value: number }
export interface SkuRow       { product: string; variant: string; sku: string; orders: number; units: number; revenue: number }
export interface ChannelRow   { channel: string; orders: number; revenue: number }
export interface ReferrerRow  { referrer: string; orders: number; revenue: number }
export interface CohortRow    { month: string; customers: number; repeat_customers: number; repeat_rate: number; revenue: number }
export interface SalesBreakdown {
  gross_sales: number; discounts: number; returns: number; net_sales: number;
  shipping: number; taxes: number; total_sales: number;
}
export interface ShopifyDeltas {
  gross_sales: number | null; net_sales: number | null; total_sales: number | null;
  orders: number | null; aov: number | null; returning_rate: number | null;
}
export interface FpCampaign   { campaign_id: string; campaign_name: string; campaign_type: string; status: string; daily_budget: number }
export interface Ga4StateRow  { state: string; sessions: number; conversions: number; revenue: number }
export interface Ga4SrcRow    { source: string; sessions: number; conversions: number; revenue: number }
export interface GscRow       { query: string; impressions: number; clicks: number; ctr?: number; position?: number }
export interface ClarityRow   { date: string; sessions: number; rage_clicks: number; dead_clicks: number; quick_back: number; scroll_depth: number; js_errors: number }
export interface GkStateRow   { state: string; prepaid: number; cod: number; rto: number; revenue: number }
export interface GkPinRow     { pincode: string; prepaid: number; cod: number; rto: number }

export type DailyPoint = Record<string, number | string>;

export interface Digest {
  window: { start: string; end: string };
  meta:     Status & { totals: Record<string, number>; daily: DailyPoint[]; top_campaigns: TopCampaign[]; regions: RegionRow[] };
  shopify:  Status & { totals: Record<string, number>; deltas: ShopifyDeltas; breakdown: SalesBreakdown; daily: DailyPoint[]; by_channel: ChannelRow[]; by_referrer: ReferrerRow[]; cohorts: CohortRow[]; top_skus: SkuRow[] };
  amazon:   Status & { totals: Record<string, number>; daily: DailyPoint[] };
  flipkart: Status & { totals: Record<string, number>; daily: DailyPoint[]; campaigns: FpCampaign[] };
  ga4:      Status & { totals: Record<string, number>; daily: DailyPoint[]; by_state: Ga4StateRow[]; by_source: Ga4SrcRow[] };
  gsc:      Status & { totals: Record<string, number>; daily: DailyPoint[]; top_converting: GscRow[]; content_gaps: GscRow[] };
  clarity:  Status & { totals: Record<string, number>; daily: ClarityRow[]; daily_series: DailyPoint[] };
  gokwik:   Status & { totals: Record<string, number>; daily: DailyPoint[]; by_state: GkStateRow[]; by_pincode: GkPinRow[] };
}
