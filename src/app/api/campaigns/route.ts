import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isValidDate, isValidPlatform, isValidStatus, isDateRangeValid } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get("platform");
  const status = searchParams.get("status");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  if (platform && !isValidPlatform(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  if (status && !isValidStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (startDate && !isValidDate(startDate)) {
    return NextResponse.json({ error: "Invalid start_date" }, { status: 400 });
  }

  if (endDate && !isValidDate(endDate)) {
    return NextResponse.json({ error: "Invalid end_date" }, { status: 400 });
  }

  if (startDate && endDate && !isDateRangeValid(startDate, endDate)) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  // Fetch campaigns
  let query = supabase.from("campaigns").select("*");
  if (platform) query = query.eq("platform", platform);
  if (status) query = query.eq("status", status);
  query = query.order("updated_at", { ascending: false });

  const { data: campaigns, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json([]);
  }

  // Fetch aggregated metrics for each campaign
  const campaignIds = campaigns.map((c) => c.id);

  let metricsQuery = supabase
    .from("campaign_metrics")
    .select("*")
    .in("campaign_id", campaignIds);

  if (startDate) metricsQuery = metricsQuery.gte("date", startDate);
  if (endDate) metricsQuery = metricsQuery.lte("date", endDate);

  const { data: metrics } = await metricsQuery;

  // Aggregate metrics per campaign
  const metricsMap = new Map<string, {
    total_spend: number;
    total_clicks: number;
    total_impressions: number;
    total_conversions: number;
    total_revenue: number;
  }>();

  for (const m of metrics || []) {
    const existing = metricsMap.get(m.campaign_id) || {
      total_spend: 0,
      total_clicks: 0,
      total_impressions: 0,
      total_conversions: 0,
      total_revenue: 0,
    };
    existing.total_spend += Number(m.spend);
    existing.total_clicks += Number(m.clicks);
    existing.total_impressions += Number(m.impressions);
    existing.total_conversions += Number(m.conversions);
    existing.total_revenue += Number(m.roas) * Number(m.spend);
    metricsMap.set(m.campaign_id, existing);
  }

  // Merge campaigns with their metrics
  const result = campaigns.map((c) => {
    const m = metricsMap.get(c.id);
    return {
      ...c,
      total_spend: m?.total_spend || 0,
      total_clicks: m?.total_clicks || 0,
      total_impressions: m?.total_impressions || 0,
      total_conversions: m?.total_conversions || 0,
      avg_ctr: m && m.total_impressions > 0
        ? (m.total_clicks / m.total_impressions) * 100
        : 0,
      cost_per_result: m && m.total_conversions > 0
        ? m.total_spend / m.total_conversions
        : 0,
      avg_roas: m && m.total_spend > 0
        ? m.total_revenue / m.total_spend
        : 0,
    };
  });

  return NextResponse.json(result);
}
