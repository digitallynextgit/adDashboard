import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isValidDate, isDateRangeValid } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

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

  // Fetch campaign info
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Fetch daily metrics
  const { data: metrics, error: metricsError } = await supabase
    .from("campaign_metrics")
    .select("*")
    .eq("campaign_id", id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (metricsError) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

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
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  return NextResponse.json({
    campaign,
    daily: metrics.map((m) => ({
      date: m.date,
      spend: Number(m.spend),
      impressions: Number(m.impressions),
      clicks: Number(m.clicks),
      conversions: Number(m.conversions),
      cpc: Number(m.cpc),
      ctr: Number(m.ctr),
      roas: Number(m.roas),
    })),
    totals: {
      spend: totalSpend,
      clicks: totalClicks,
      impressions: totalImpressions,
      conversions: totalConversions,
      cpc: avgCpc,
      ctr: avgCtr,
      roas: avgRoas,
    },
  });
}
