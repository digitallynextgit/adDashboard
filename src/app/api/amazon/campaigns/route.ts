import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isValidDate, isDateRangeValid } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("start_date");
  const endDate   = searchParams.get("end_date");

  if (!startDate || !endDate)
    return NextResponse.json({ error: "start_date and end_date are required" }, { status: 400 });
  if (!isValidDate(startDate) || !isValidDate(endDate))
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  if (!isDateRangeValid(startDate, endDate))
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });

  const { data: campaigns, error: cErr } = await supabase
    .from("amazon_campaigns")
    .select("id, campaign_id, campaign_name, campaign_type, targeting_type, status, daily_budget");

  if (cErr)
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });

  const campaignIds = campaigns.map((c) => c.id);
  if (campaignIds.length === 0)
    return NextResponse.json([]);

  const { data: metrics, error: mErr } = await supabase
    .from("amazon_metrics")
    .select("campaign_id, spend, impressions, clicks, orders, units_ordered, sales, acos, roas")
    .in("campaign_id", campaignIds)
    .gte("date", startDate)
    .lte("date", endDate);

  if (mErr)
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });

  // Aggregate metrics per campaign
  const metricMap = new Map<string, {
    spend: number; impressions: number; clicks: number;
    orders: number; units_ordered: number; sales: number;
  }>();

  for (const m of metrics) {
    const existing = metricMap.get(m.campaign_id) ?? {
      spend: 0, impressions: 0, clicks: 0, orders: 0, units_ordered: 0, sales: 0,
    };
    existing.spend         += Number(m.spend);
    existing.impressions   += Number(m.impressions);
    existing.clicks        += Number(m.clicks);
    existing.orders        += Number(m.orders);
    existing.units_ordered += Number(m.units_ordered);
    existing.sales         += Number(m.sales);
    metricMap.set(m.campaign_id, existing);
  }

  const result = campaigns.map((c) => {
    const m = metricMap.get(c.id) ?? {
      spend: 0, impressions: 0, clicks: 0, orders: 0, units_ordered: 0, sales: 0,
    };
    return {
      ...c,
      ...m,
      ctr:  m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
      cpc:  m.clicks > 0 ? m.spend / m.clicks : 0,
      acos: m.sales > 0 ? (m.spend / m.sales) * 100 : 0,
      roas: m.spend > 0 ? m.sales / m.spend : 0,
    };
  }).sort((a, b) => b.spend - a.spend);

  return NextResponse.json(result);
}
