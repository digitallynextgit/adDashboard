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

  const { data: metrics, error } = await supabase
    .from("flipkart_metrics")
    .select("date, spend, impressions, clicks, orders, units_sold, revenue, roas")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });

  // Aggregate daily totals across all campaigns
  const dailyMap = new Map<string, {
    date: string; spend: number; impressions: number; clicks: number;
    orders: number; units_sold: number; revenue: number;
  }>();

  for (const m of metrics) {
    const existing = dailyMap.get(m.date) ?? {
      date: m.date, spend: 0, impressions: 0, clicks: 0,
      orders: 0, units_sold: 0, revenue: 0,
    };
    existing.spend       += Number(m.spend);
    existing.impressions += Number(m.impressions);
    existing.clicks      += Number(m.clicks);
    existing.orders      += Number(m.orders);
    existing.units_sold  += Number(m.units_sold);
    existing.revenue     += Number(m.revenue);
    dailyMap.set(m.date, existing);
  }

  const daily = Array.from(dailyMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      ...d,
      ctr:  d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
      cpc:  d.clicks > 0 ? d.spend / d.clicks : 0,
      roas: d.spend > 0 ? d.revenue / d.spend : 0,
    }));

  const totalSpend       = daily.reduce((s, d) => s + d.spend, 0);
  const totalImpressions = daily.reduce((s, d) => s + d.impressions, 0);
  const totalClicks      = daily.reduce((s, d) => s + d.clicks, 0);
  const totalOrders      = daily.reduce((s, d) => s + d.orders, 0);
  const totalRevenue     = daily.reduce((s, d) => s + d.revenue, 0);

  return NextResponse.json({
    daily,
    totals: {
      spend:       totalSpend,
      impressions: totalImpressions,
      clicks:      totalClicks,
      ctr:         totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc:         totalClicks > 0 ? totalSpend / totalClicks : 0,
      orders:      totalOrders,
      revenue:     totalRevenue,
      roas:        totalSpend > 0 ? totalRevenue / totalSpend : 0,
    },
  });
}
