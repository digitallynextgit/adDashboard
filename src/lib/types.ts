export type Platform = "meta" | "google";

export interface Campaign {
  id: string;
  platform: Platform;
  campaign_id: string;
  campaign_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignMetric {
  id: string;
  campaign_id: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  cost_per_conversion: number;
  roas: number;
  currency: string;
}

export interface CampaignWithMetrics extends Campaign {
  total_spend: number;
  total_clicks: number;
  total_impressions: number;
  avg_ctr: number;
  cost_per_result: number;
  total_conversions: number;
  avg_roas: number;
}

export interface DailyMetric {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface SyncLog {
  id: string;
  platform: Platform;
  status: string;
  records: number;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface MetricCardData {
  title: string;
  value: string;
  change: number | null;
  prefix?: string;
}
