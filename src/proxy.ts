import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "adauto_session";
const PUBLIC_PATHS   = new Set(["/login", "/api/auth/login"]);

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

function redirectToLogin(req: NextRequest, clearCookie = false) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  if (clearCookie) res.cookies.delete({ name: SESSION_COOKIE, path: "/" });
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return redirectToLogin(req);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return redirectToLogin(req);

  const url = `${supabaseUrl}/rest/v1/sessions?id=eq.${encodeURIComponent(token)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id`;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (!res.ok) return redirectToLogin(req, true);

    const sessions = await res.json();
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return redirectToLogin(req, true);
    }

    return NextResponse.next();
  } catch {
    // Network error reaching Supabase — fail closed (deny access)
    return redirectToLogin(req);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
