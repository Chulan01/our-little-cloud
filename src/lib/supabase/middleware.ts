import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isLocalAuthEnabled, LOCAL_AUTH_COOKIE } from "@/lib/local-auth";

/**
 * Session cookies set by @supabase/ssr are named `sb-<project-ref>-auth-token`
 * and hold a URL-encoded JSON blob with the access/refresh tokens.
 *
 * Strategy (fast edge runtime AND no stale-session crashes):
 *   - Guests (no matching session cookie) are redirected to /login with zero
 *     network I/O.
 *   - A session whose access token is still valid passes through with zero
 *     network I/O — no `getUser()` per request, so a slow/unreachable
 *     Supabase can't cause `504 MIDDLEWARE_INVOCATION_TIMEOUT` again.
 *   - Only when the access token is actually at/near expiry do we call
 *     `getUser()` here — the one place allowed to write cookies outside a
 *     Server Action. Without this, a stale session makes the root layout's
 *     `getUnreadMessageCount()` → `getUser()` attempt a token refresh during
 *     render, and `cookies().set()` throws there → generic "Application
 *     error" page (exactly what a partner with an old tab/session hits).
 *
 * Real couple-binding checks still happen in pages/actions via
 * `requireUser()`/`requireCouple()`.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

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

  // Only a cookie for THIS project counts as a session — a stale cookie from
  // an old project/ref must be treated as guest, otherwise it would keep the
  // middleware from redirecting while getUser() in the layout still crashes.
  const sessionPrefix = `sb-${projectRef(supabaseUrl)}-`;
  const sessionCookie = request.cookies.getAll().find((cookie) => cookie.name.startsWith(sessionPrefix));

  if (!sessionCookie && !isAuthRoute && !isPublicAsset) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Token still valid → pass through without touching the network.
  if (sessionCookie && !isSessionExpired(sessionCookie.value)) {
    return response;
  }

  // Stale or unverifiable session → refresh it right here (middleware may
  // write cookies; Server Components may not). On failure the session is
  // gone: clear the cookie and send to login instead of crashing the render.
  if (sessionCookie) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // Official @supabase/ssr middleware pattern: also mutate the request
        // cookies and rebuild the response, so the page render that follows
        // this request sees the refreshed session (otherwise the layout's
        // getUser() would re-attempt a refresh and cookieStore.set() would
        // throw in the Server Component again).
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    });

    const { error } = await supabase.auth.getUser();
    if (error) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      const redirectResponse = NextResponse.redirect(url);
      redirectResponse.cookies.delete(sessionCookie.name);
      return redirectResponse;
    }
  }

  return response;
}

/** `https://<ref>.supabase.co` → `<ref>`, the prefix used in session cookie names. */
function projectRef(supabaseUrl: string): string {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

/**
 * Returns true when the session cookie's access token is at/near expiry (or
 * unparseable — safest to refresh). False means the token is still valid and
 * the request can pass through without any network call.
 */
function isSessionExpired(cookieValue: string): boolean {
  const accessToken = extractAccessToken(cookieValue);
  if (!accessToken) return true;
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return true;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const claims = JSON.parse(atob(padded));
    if (typeof claims.exp !== "number") return true;
    // Refresh slightly early (30s) to avoid racing the exact expiry instant.
    return claims.exp * 1000 <= Date.now() + 30_000;
  } catch {
    return true;
  }
}

/** Handles both the URL-encoded JSON blob (`{"access_token":…}`) and a raw JWT. */
function extractAccessToken(cookieValue: string): string | null {
  const decoded = decodeURIComponent(cookieValue);
  try {
    const data = JSON.parse(decoded);
    if (typeof data.access_token === "string") return data.access_token;
  } catch {
    // not JSON — fall through
  }
  if (decoded.split(".").length === 3) return decoded;
  return null;
}
