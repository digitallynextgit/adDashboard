import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isValidDate, isValidPlatform, isDateRangeValid } from "@/lib/validation";

const VALID_BREAKDOWN_TYPES = ["age_gender", "region"];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const platform = searchParams.get("platform");
  const breakdownType = searchParams.get("breakdown_type") ?? "age_gender";

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "start_date and end_date are required" },
      { status: 400 }
    );
  }
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  if (!isDateRangeValid(startDate, endDate)) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }
  if (platform && !isValidPlatform(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }
  if (!VALID_BREAKDOWN_TYPES.includes(breakdownType)) {
    return NextResponse.json({ error: "Invalid breakdown_type" }, { status: 400 });
  }

  // Get campaign IDs filtered by platform if provided
  let campaignQuery = supabase.from("campaigns").select("id");
  if (platform) campaignQuery = campaignQuery.eq("platform", platform);
  const { data: campaigns, error: campaignError } = await campaignQuery;
  if (campaignError) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  const campaignIds = campaigns.map((c) => c.id);
  if (campaignIds.length === 0) return NextResponse.json({ breakdown: [] });

  const { data: rows, error } = await supabase
    .from("audience_breakdowns")
    .select("breakdown_value, spend, impressions, clicks, purchases, purchase_value")
    .in("campaign_id", campaignIds)
    .eq("breakdown_type", breakdownType)
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  // Aggregate by breakdown_value across all days and campaigns
  const map = new Map<string, {
    breakdown_value: string;
    spend: number;
    impressions: number;
    clicks: number;
    purchases: number;
    purchase_value: number;
  }>();

  for (const r of rows) {
    const existing = map.get(r.breakdown_value) ?? {
      breakdown_value: r.breakdown_value,
      spend: 0, impressions: 0, clicks: 0,
      purchases: 0, purchase_value: 0,
    };
    existing.spend += Number(r.spend);
    existing.impressions += Number(r.impressions);
    existing.clicks += Number(r.clicks);
    existing.purchases += Number(r.purchases);
    existing.purchase_value += Number(r.purchase_value);
    map.set(r.breakdown_value, existing);
  }

  const totalSpend = Array.from(map.values()).reduce((s, b) => s + b.spend, 0);

  const breakdown = Array.from(map.values())
    .map((b) => ({
      ...b,
      ctr: b.impressions > 0 ? (b.clicks / b.impressions) * 100 : 0,
      roas: b.spend > 0 ? b.purchase_value / b.spend : 0,
      spend_share: totalSpend > 0 ? (b.spend / totalSpend) * 100 : 0,
    }))
    .sort((a, b) => b.spend - a.spend);

  return NextResponse.json({ breakdown });
}
