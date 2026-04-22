import { createClient } from "@supabase/supabase-js";
import { scryptSync, timingSafeEqual, randomBytes } from "crypto";

const SESSION_COOKIE = "adauto_session";
const SESSION_EXPIRY_DAYS = 30;

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars are not configured");
  return createClient(url, key);
}

// Verify password against the AUTH_PASSWORD_HASH env var
export function verifyPassword(password: string): boolean {
  const stored = process.env.AUTH_PASSWORD_HASH;
  if (!stored) return false;
  const [salt, storedHex] = stored.split(":");
  if (!salt || !storedHex) return false;
  try {
    const inputHash  = scryptSync(password, salt, 64);
    const storedHash = Buffer.from(storedHex, "hex");
    if (inputHash.length !== storedHash.length) return false;
    return timingSafeEqual(inputHash, storedHash);
  } catch {
    return false;
  }
}

// Generate a random 64-char hex token (goes in the cookie)
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

// Insert a new session into Supabase. Returns true on success, false on failure.
export async function createSession(token: string): Promise<boolean> {
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_EXPIRY_DAYS);
  const { error } = await db()
    .from("sessions")
    .insert({ id: token, expires_at: expires.toISOString() });
  return !error;
}

// Delete session from DB (on logout)
export async function deleteSession(token: string): Promise<void> {
  await db().from("sessions").delete().eq("id", token);
}

export { SESSION_COOKIE, SESSION_EXPIRY_DAYS };
