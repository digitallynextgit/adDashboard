import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isValidDate, isValidPlatform, isDateRangeValid } from "@/lib/validation";

interface CreativeAgg {
  ad_id: string;
  ad_name: string;
  adset_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchase_value: number;
  add_to_cart: number;
  landing_page_views: number;
  video_3s_views: number;
  video_thruplay: number;
  reach: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const platform = searchParams.get("platform");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 10;

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

  // Get campaign IDs filtered by platform if provided
  let campaignQuery = supabase.from("campaigns").select("id");
  if (platform) campaignQuery = campaignQuery.eq("platform", platform);
  const { data: campaigns, error: campaignError } = await campaignQuery;
  if (campaignError) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  const campaignIds = campaigns.map((c) => c.id);
  if (campaignIds.length === 0) return NextResponse.json({ creatives: [] });

  const { data: rows, error } = await supabase
    .from("ad_creatives")
    .select(
      "ad_id, ad_name, adset_name, spend, impressions, clicks, purchases, purchase_value, add_to_cart, landing_page_views, video_3s_views, video_thruplay, reach"
    )
    .in("campaign_id", campaignIds)
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  // Aggregate by ad_id across all days
  const map = new Map<string, CreativeAgg>();
  for (const r of rows) {
    const existing = map.get(r.ad_id) ?? {
      ad_id: r.ad_id,
      ad_name: r.ad_name,
      adset_name: r.adset_name || "",
      spend: 0, impressions: 0, clicks: 0,
      purchases: 0, purchase_value: 0,
      add_to_cart: 0, landing_page_views: 0,
      video_3s_views: 0, video_thruplay: 0, reach: 0,
    };
    existing.spend += Number(r.spend);
    existing.impressions += Number(r.impressions);
    existing.clicks += Number(r.clicks);
    existing.purchases += Number(r.purchases);
    existing.purchase_value += Number(r.purchase_value);
    existing.add_to_cart += Number(r.add_to_cart);
    existing.landing_page_views += Number(r.landing_page_views);
    existing.video_3s_views += Number(r.video_3s_views);
    existing.video_thruplay += Number(r.video_thruplay);
    existing.reach += Number(r.reach);
    map.set(r.ad_id, existing);
  }

  const creatives = Array.from(map.values())
    .map((c) => ({
      ...c,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
      cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
      roas: c.spend > 0 ? c.purchase_value / c.spend : 0,
      cost_per_purchase: c.purchases > 0 ? c.spend / c.purchases : 0,
      thumb_stop_rate: c.impressions > 0 ? (c.video_3s_views / c.impressions) * 100 : 0,
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, limit);

  return NextResponse.json({ creatives });
}
