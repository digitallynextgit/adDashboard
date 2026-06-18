import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { aggregateH2sFacts } from "@/lib/h2s/aggregate";
import { detectAnomalies }   from "@/lib/h2s/anomalies";
import { buildWeeklyPrompt } from "@/lib/h2s/prompts";
import { callClaude, MODELS } from "@/lib/claude";

export const dynamic = "force-dynamic";
export const maxDuration = 60;  // up to 60s for the LLM call

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key);
}

export async function POST() {
  try {
    // 1. Aggregate facts (last 7 days vs previous 7 days)
    const facts = await aggregateH2sFacts();

    // 2. Run rules-based anomaly detection (mutates facts.anomalies)
    await detectAnomalies(facts);

    // 3. Build the prompt with cached system block + facts
    const prompt = buildWeeklyPrompt(facts);

    // 4. Call the LLM (Groq today, Claude later)
    const result = await callClaude({
      model:       "sonnet",  // weekly synthesis tier (maps to llama-3.3-70b on Groq)
      purpose:     "h2s_weekly",
      system:      prompt.system,
      messages:    prompt.messages,
      maxTokens:   6000,
      temperature: 0.4,
    });

    // 5. Persist the report
    const client = db();
    const modelUsed = MODELS.sonnet;

    const { data: saved, error } = await client
      .from("h2s_reports")
      .upsert(
        {
          week_start:  facts.this_week.start,
          week_end:    facts.this_week.end,
          markdown:    result.text,
          fact_object: facts,
          model_used:  modelUsed,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "week_start" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to save report", details: error.message, markdown: result.text },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      report: saved,
      llm: {
        model:        modelUsed,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        duration_ms:  result.durationMs,
        cost_usd:     result.costUsd,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
