import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isValidDate, isValidPlatform, isDateRangeValid } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const platform = searchParams.get("platform");

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

  // Build campaign filter
  let campaignQuery = supabase.from("campaigns").select("id, platform");
  if (platform) {
    campaignQuery = campaignQuery.eq("platform", platform);
  }

  const { data: campaigns, error: campaignError } = await campaignQuery;
  if (campaignError) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  const campaignIds = campaigns.map((c) => c.id);

  if (campaignIds.length === 0) {
    return NextResponse.json({ daily: [], totals: {} });
  }

  // Fetch metrics for those campaigns in date range
  const { data: metrics, error: metricsError } = await supabase
    .from("campaign_metrics")
    .select("*")
    .in("campaign_id", campaignIds)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (metricsError) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  // Aggregate daily totals
  interface DailyAgg {
    date: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    reach: number;
    purchases: number;
    purchase_value: number;
    add_to_cart: number;
    initiate_checkout: number;
    landing_page_views: number;
    video_thruplay: number;
    video_3s_views: number;
  }

  const dailyMap = new Map<string, DailyAgg>();

  for (const m of metrics) {
    const existing = dailyMap.get(m.date) || {
      date: m.date,
      spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0,
      reach: 0, purchases: 0, purchase_value: 0,
      add_to_cart: 0, initiate_checkout: 0, landing_page_views: 0,
      video_thruplay: 0, video_3s_views: 0,
    };
    existing.spend += Number(m.spend);
    existing.impressions += Number(m.impressions);
    existing.clicks += Number(m.clicks);
    existing.conversions += Number(m.conversions);
    existing.revenue += Number(m.roas) * Number(m.spend);
    existing.reach += Number(m.reach || 0);   
    existing.purchases += Number(m.purchases || 0);
    existing.purchase_value += Number(m.purchase_value || 0);
    existing.add_to_cart += Number(m.add_to_cart || 0);
    existing.initiate_checkout += Number(m.initiate_checkout || 0);
    existing.landing_page_views += Number(m.landing_page_views || 0);
    existing.video_thruplay += Number(m.video_thruplay || 0);
    existing.video_3s_views += Number(m.video_3s_views || 0);
    dailyMap.set(m.date, existing);
  }

  const daily = Array.from(dailyMap.values()).sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  // Calculate totals
  const totalSpend = metrics.reduce((s, m) => s + Number(m.spend), 0);
  const totalClicks = metrics.reduce((s, m) => s + Number(m.clicks), 0);
  const totalImpressions = metrics.reduce((s, m) => s + Number(m.impressions), 0);
  const totalConversions = metrics.reduce((s, m) => s + Number(m.conversions), 0);
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const totalRevenue = metrics.reduce(
    (s, m) => s + Number(m.roas) * Number(m.spend),
    0
  );
  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const totalReach = metrics.reduce((s, m) => s + Number(m.reach || 0), 0);
  const totalPurchases = metrics.reduce((s, m) => s + Number(m.purchases || 0), 0);
  const totalPurchaseValue = metrics.reduce((s, m) => s + Number(m.purchase_value || 0), 0);
  const totalAddToCart = metrics.reduce((s, m) => s + Number(m.add_to_cart || 0), 0);
  const totalInitiateCheckout = metrics.reduce((s, m) => s + Number(m.initiate_checkout || 0), 0);
  const totalLandingPageViews = metrics.reduce((s, m) => s + Number(m.landing_page_views || 0), 0);
  const totalVideoThruplay = metrics.reduce((s, m) => s + Number(m.video_thruplay || 0), 0);
  const totalVideo3sViews = metrics.reduce((s, m) => s + Number(m.video_3s_views || 0), 0);

  return NextResponse.json({
    daily,
    totals: {
      spend: totalSpend,
      clicks: totalClicks,
      impressions: totalImpressions,
      conversions: totalConversions,
      cpc: avgCpc,
      ctr: avgCtr,
      roas: overallRoas,
      reach: totalReach,
      frequency: totalReach > 0 ? totalImpressions / totalReach : 0,
      cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
      purchases: totalPurchases,
      purchase_value: totalPurchaseValue,
      cost_per_purchase: totalPurchases > 0 ? totalSpend / totalPurchases : 0,
      add_to_cart: totalAddToCart,
      cost_per_add_to_cart: totalAddToCart > 0 ? totalSpend / totalAddToCart : 0,
      initiate_checkout: totalInitiateCheckout,
      cost_per_initiate_checkout: totalInitiateCheckout > 0 ? totalSpend / totalInitiateCheckout : 0,
      landing_page_views: totalLandingPageViews,
      video_thruplay: totalVideoThruplay,
      video_3s_views: totalVideo3sViews,
      thumb_stop_rate: totalImpressions > 0 ? (totalVideo3sViews / totalImpressions) * 100 : 0,
    },
  });
}
