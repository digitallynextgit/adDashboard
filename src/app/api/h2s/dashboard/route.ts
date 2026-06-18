import { NextResponse } from "next/server";

import { aggregateH2sFacts } from "@/lib/h2s/aggregate";
import { detectAnomalies }   from "@/lib/h2s/anomalies";

export const dynamic = "force-dynamic";

/**
 * Single read-only endpoint that returns the same fact object the LLM sees.
 * The dashboard renders all 8 panels off this one response.
 */
export async function GET() {
  try {
    const facts = await aggregateH2sFacts();
    await detectAnomalies(facts);
    return NextResponse.json(facts);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
