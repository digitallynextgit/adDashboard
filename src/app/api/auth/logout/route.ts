import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    try {
      await deleteSession(token);
    } catch {
      // If DB delete fails we still want the cookie cleared client-side
    }
  }

  cookieStore.delete({ name: SESSION_COOKIE, path: "/" });

  return NextResponse.json({ ok: true });
}
