import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isValidDate, isDateRangeValid } from "@/lib/validation";

export async function GET(request: NextRequest) {
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

  const { data: rows, error } = await supabase
    .from("shopify_daily_sales")
    .select(
      "date, product_id, product_title, variant_id, variant_title, sku, orders_count, units_sold, revenue"
    )
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  // Aggregate by variant_id across the date range
  interface SkuAgg {
    variant_id: string;
    product_title: string;
    variant_title: string;
    sku: string;
    orders_count: number;
    units_sold: number;
    revenue: number;
  }

  const map = new Map<string, SkuAgg>();
  let totalRevenue = 0;
  let totalUnits = 0;
  let totalOrders = 0;

  for (const r of rows) {
    const existing = map.get(r.variant_id) ?? {
      variant_id: r.variant_id,
      product_title: r.product_title,
      variant_title: r.variant_title,
      sku: r.sku,
      orders_count: 0,
      units_sold: 0,
      revenue: 0,
    };
    existing.orders_count += Number(r.orders_count);
    existing.units_sold += Number(r.units_sold);
    existing.revenue += Number(r.revenue);
    totalRevenue += Number(r.revenue);
    totalUnits += Number(r.units_sold);
    totalOrders += Number(r.orders_count);
    map.set(r.variant_id, existing);
  }

  const skus = Array.from(map.values())
    .map((s) => ({
      ...s,
      aov: s.orders_count > 0 ? s.revenue / s.orders_count : 0,
      revenue_share: totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.units_sold - a.units_sold);

  return NextResponse.json({
    skus,
    totals: {
      revenue: totalRevenue,
      units_sold: totalUnits,
      orders_count: totalOrders,
      aov: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    },
  });
}
