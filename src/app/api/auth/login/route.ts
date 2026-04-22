import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifyPassword,
  generateSessionToken,
  createSession,
  SESSION_COOKIE,
  SESSION_EXPIRY_DAYS,
} from "@/lib/auth";

// Simple in-memory rate limiter: 5 attempts per IP per 15 minutes.
// Works for a single-instance deployment; for horizontally scaled
// deployments swap this for a Redis-backed limiter.
const MAX_ATTEMPTS  = 5;
const WINDOW_MS     = 15 * 60 * 1000;
const attempts      = new Map<string, { count: number; firstAt: number }>();

function checkRateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const rec = attempts.get(ip);

  if (!rec || now - rec.firstAt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAt: now });
    return { ok: true };
  }

  if (rec.count >= MAX_ATTEMPTS) {
    return { ok: false, retryAfter: Math.ceil((rec.firstAt + WINDOW_MS - now) / 1000) };
  }

  rec.count += 1;
  return { ok: true };
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  const { password } = await req.json().catch(() => ({ password: "" }));

  if (!password || !verifyPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = generateSessionToken();
  const ok    = await createSession(token);
  if (!ok) {
    return NextResponse.json(
      { error: "Could not create session. Try again." },
      { status: 500 }
    );
  }

  // Clear rate-limit record on successful login
  attempts.delete(ip);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
