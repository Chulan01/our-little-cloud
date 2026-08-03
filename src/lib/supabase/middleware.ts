import { NextResponse, type NextRequest } from "next/server";
import { isLocalAuthEnabled, LOCAL_AUTH_COOKIE } from "@/lib/local-auth";

/**
 * Session cookies set by @supabase/ssr are named `sb-<project-ref>-auth-token`.
 *
 * The middleware only checks for the *presence* of that cookie — it performs
 * ZERO network calls to Supabase. This keeps it inside Vercel's edge runtime
 * time budget and prevents the `504 MIDDLEWARE_INVOCATION_TIMEOUT` that the
 * previous `getUser()`-per-request version could hit when Supabase was slow
 * or unreachable.
 *
 * Real session validation, token refresh, and the couple-binding check all
 * happen server-side in pages/actions via `requireUser()`/`requireCouple()`,
 * which every protected page (or its data action) already calls — they
 * redirect to /login or /onboarding as needed.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/callback");
  // `/api/*` routes enforce their own auth (e.g. `/api/upload` calls
  // requireCouple) and `/api/health` is public, so let them pass through.
  const isPublicAsset = pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // No Supabase configured → local-auth fallback (still cookie-only, no I/O).
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isLocalAuthEnabled() && !isAuthRoute && !isPublicAsset && !request.cookies.get(LOCAL_AUTH_COOKIE)?.value) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Supabase mode: a guest has no `sb-*` session cookie → redirect to /login
  // without touching the network. Authenticated users pass through and are
  // validated by the pages themselves.
  const hasSessionCookie = request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));

  if (!hasSessionCookie && !isAuthRoute && !isPublicAsset) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}
