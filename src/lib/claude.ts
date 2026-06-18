/**
 * LLM wrapper for H2S analytics.
 *
 *   CURRENT PROVIDER: Groq (free tier, Llama 3.3 70B / Llama 3.1 8B)
 *   FUTURE PROVIDER:  Anthropic Claude (Sonnet 4.6, Haiku 4.5)
 *
 * To switch providers:
 *   1. Comment out the GROQ section (imports + callClaude function)
 *   2. Uncomment the ANTHROPIC section
 *   3. Make sure ANTHROPIC_API_KEY is set in .env.local
 *
 * The exported API is the same for both providers, so call sites
 * (aggregate.ts, generate-report route, etc.) don't change.
 */

import { createClient } from "@supabase/supabase-js";

// ============================================================================
// SHARED TYPES & UTILITIES  (used by both providers)
// ============================================================================

export interface SystemBlock {
  text: string;
  /** Anthropic only — ignored by Groq (no prompt caching support). */
  cache?: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CallOptions {
  model: ModelKey;
  /** Short tag for the ledger: 'h2s_weekly' | 'h2s_anomaly' | etc. */
  purpose: string;
  system: SystemBlock[];
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface CallResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
  costUsd: number;
  durationMs: number;
  requestId: string | null;
  cacheHitRatio: number;
}

const DAILY_CAP_USD = Number(process.env.CLAUDE_DAILY_CAP_USD ?? "5");

/** Best-effort ledger writer. Failures here never block the API call. */
async function logToLedger(row: Record<string, unknown>): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const client = createClient(url, key);
    await client.from("claude_calls").insert(row);
  } catch (e) {
    console.warn("[llm] ledger write failed:", e);
  }
}

export async function getTodaysSpend(): Promise<number> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return 0;
    const client = createClient(url, key);
    const startUtc = new Date();
    startUtc.setUTCHours(0, 0, 0, 0);
    const { data } = await client
      .from("claude_calls")
      .select("cost_usd")
      .gte("occurred_at", startUtc.toISOString());
    if (!data) return 0;
    return data.reduce((s: number, r: { cost_usd: number | string }) => s + Number(r.cost_usd), 0);
  } catch {
    return 0;
  }
}

export async function assertBudgetAvailable(): Promise<void> {
  const spent = await getTodaysSpend();
  if (spent >= DAILY_CAP_USD) {
    throw new Error(
      `Daily LLM cap reached: $${spent.toFixed(2)} / $${DAILY_CAP_USD}. ` +
      `Resume tomorrow or raise CLAUDE_DAILY_CAP_USD.`
    );
  }
}

// ============================================================================
// === ACTIVE: GROQ PROVIDER  (free tier — used until Claude credits purchased) ===
// ============================================================================

import Groq from "groq-sdk";

/**
 * Groq model mapping.
 *   "opus" + "sonnet" → llama-3.3-70b-versatile (best free model)
 *   "haiku"           → llama-3.1-8b-instant   (fast, small classifier)
 */
export const MODELS = {
  opus:   "llama-3.3-70b-versatile",
  sonnet: "llama-3.3-70b-versatile",
  haiku:  "llama-3.1-8b-instant",
} as const;

export type ModelKey = keyof typeof MODELS;

function groqClient(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set in .env.local");
  return new Groq({ apiKey: key });
}

export async function callClaude(opts: CallOptions): Promise<CallResult> {
  await assertBudgetAvailable();

  const modelId = MODELS[opts.model];
  const started = Date.now();

  // Groq is OpenAI-format: system becomes a message with role: "system".
  // We merge all SystemBlocks into one block; cache flags are ignored.
  const systemText = opts.system.map((b) => b.text).join("\n\n");

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemText },
    ...opts.messages,
  ];

  try {
    const response = await groqClient().chat.completions.create({
      model:       modelId,
      messages,
      max_tokens:  opts.maxTokens  ?? 4096,
      temperature: opts.temperature ?? 0.4,
    });

    const usage        = response.usage;
    const inputTokens  = usage?.prompt_tokens     ?? 0;
    const outputTokens = usage?.completion_tokens ?? 0;
    const durationMs   = Date.now() - started;
    const text         = response.choices[0]?.message?.content ?? "";
    const requestId    = response.id ?? null;

    // Groq free tier — cost is always $0.
    const costUsd = 0;

    await logToLedger({
      model:               modelId,
      purpose:             opts.purpose,
      input_tokens:        inputTokens,
      output_tokens:       outputTokens,
      cache_read_tokens:   0,
      cache_create_tokens: 0,
      cost_usd:            costUsd,
      duration_ms:         durationMs,
      request_id:          requestId,
    });

    return {
      text,
      inputTokens,
      outputTokens,
      cacheReadTokens:   0,
      cacheCreateTokens: 0,
      costUsd,
      durationMs,
      requestId,
      cacheHitRatio:     0,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logToLedger({
      model:         modelId,
      purpose:       opts.purpose,
      input_tokens:  0,
      output_tokens: 0,
      cost_usd:      0,
      duration_ms:   Date.now() - started,
      error:         message.slice(0, 1000),
    });
    throw e;
  }
}

// ============================================================================
// === COMMENTED: ANTHROPIC CLAUDE PROVIDER ===================================
// === Uncomment this block (and comment the GROQ block above) once    ========
// === Claude API credits are purchased and ANTHROPIC_API_KEY is set.  ========
// ============================================================================

/*
import Anthropic from "@anthropic-ai/sdk";

// Anthropic model IDs
export const MODELS = {
  opus:   "claude-opus-4-7",
  sonnet: "claude-sonnet-4-6",
  haiku:  "claude-haiku-4-5-20251001",
} as const;

export type ModelKey = keyof typeof MODELS;

// USD per 1M tokens (5-min ephemeral cache tier).
// in = base input, out = base output, cw = cache write, cr = cache read.
const PRICING: Record<string, { in: number; out: number; cw: number; cr: number }> = {
  "claude-opus-4-7":           { in: 5.00, out: 25.00, cw: 6.25, cr: 0.50 },
  "claude-sonnet-4-6":         { in: 3.00, out: 15.00, cw: 3.75, cr: 0.30 },
  "claude-haiku-4-5-20251001": { in: 1.00, out:  5.00, cw: 1.25, cr: 0.10 },
};

function anthropicClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set in .env.local");
  return new Anthropic({ apiKey: key });
}

function calcCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreateTokens: number,
  cacheReadTokens: number,
): number {
  const p = PRICING[model];
  if (!p) return 0;
  return (
    (inputTokens       * p.in  / 1_000_000) +
    (outputTokens      * p.out / 1_000_000) +
    (cacheCreateTokens * p.cw  / 1_000_000) +
    (cacheReadTokens   * p.cr  / 1_000_000)
  );
}

export async function callClaude(opts: CallOptions): Promise<CallResult> {
  await assertBudgetAvailable();

  const modelId = MODELS[opts.model];
  const started = Date.now();

  const systemParam = opts.system.map((b) => ({
    type: "text" as const,
    text: b.text,
    ...(b.cache ? { cache_control: { type: "ephemeral" as const } } : {}),
  }));

  try {
    const response = await anthropicClient().messages.create({
      model:       modelId,
      max_tokens:  opts.maxTokens  ?? 4096,
      temperature: opts.temperature ?? 0.4,
      system:      systemParam,
      messages:    opts.messages,
    });

    const u = response.usage;
    const inputTokens       = u.input_tokens ?? 0;
    const outputTokens      = u.output_tokens ?? 0;
    const cacheReadTokens   = (u.cache_read_input_tokens     ?? 0) as number;
    const cacheCreateTokens = (u.cache_creation_input_tokens ?? 0) as number;

    const costUsd    = calcCost(modelId, inputTokens, outputTokens, cacheCreateTokens, cacheReadTokens);
    const durationMs = Date.now() - started;

    const text = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    const requestId =
      ((response as unknown as { _request_id?: string })._request_id) ?? null;

    await logToLedger({
      model:               modelId,
      purpose:             opts.purpose,
      input_tokens:        inputTokens,
      output_tokens:       outputTokens,
      cache_read_tokens:   cacheReadTokens,
      cache_create_tokens: cacheCreateTokens,
      cost_usd:            costUsd,
      duration_ms:         durationMs,
      request_id:          requestId,
    });

    const totalInput    = inputTokens + cacheReadTokens + cacheCreateTokens;
    const cacheHitRatio = totalInput > 0 ? cacheReadTokens / totalInput : 0;

    return {
      text,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheCreateTokens,
      costUsd,
      durationMs,
      requestId,
      cacheHitRatio,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logToLedger({
      model:         modelId,
      purpose:       opts.purpose,
      input_tokens:  0,
      output_tokens: 0,
      cost_usd:      0,
      duration_ms:   Date.now() - started,
      error:         message.slice(0, 1000),
    });
    throw e;
  }
}
*/
