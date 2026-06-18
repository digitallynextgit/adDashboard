/**
 * Temporary diagnostic — confirms which env vars Next.js sees at runtime.
 * Returns booleans only; never the raw values.
 * Delete this file before deploying.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL:      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_KEY:          Boolean(process.env.SUPABASE_SERVICE_KEY),
    GROQ_API_KEY:                  Boolean(process.env.GROQ_API_KEY),
    ANTHROPIC_API_KEY:             Boolean(process.env.ANTHROPIC_API_KEY),

    // Show the role embedded in whichever Supabase key is being used by writes
    write_key_role: (() => {
      const k = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!k) return null;
      try {
        const payload = JSON.parse(Buffer.from(k.split(".")[1], "base64").toString());
        return payload.role ?? null;
      } catch {
        return "unparseable";
      }
    })(),
  });
}
