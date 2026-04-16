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

  const { data, error } = await supabase
    .from("planned_spend")
    .select("week_start, planned_spend, notes")
    .gte("week_start", startDate)
    .lte("week_start", endDate)
    .order("week_start", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  return NextResponse.json({ planned_spend: data });
}

export async function POST(request: NextRequest) {
  let body: { week_start: string; planned_spend: number; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { week_start, planned_spend, notes } = body;

  if (!week_start || !isValidDate(week_start)) {
    return NextResponse.json({ error: "Invalid week_start date" }, { status: 400 });
  }
  if (typeof planned_spend !== "number" || planned_spend < 0) {
    return NextResponse.json({ error: "planned_spend must be a non-negative number" }, { status: 400 });
  }

  const { error } = await supabase
    .from("planned_spend")
    .upsert(
      { week_start, planned_spend, notes: notes ?? null },
      { onConflict: "week_start" }
    );

  if (error) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
