import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import type { LocalGenericSchema } from "@/types/supabase-generic";
import { isLocalAuthEnabled, LOCAL_AUTH_COOKIE } from "@/lib/local-auth";

type PublicSchema = Database["public"] & LocalGenericSchema;

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/callback");
  const isPublicAsset = pathname.startsWith("/_next") || pathname.includes(".");

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isLocalAuthEnabled() && !isAuthRoute && !isPublicAsset && !request.cookies.get(LOCAL_AUTH_COOKIE)?.value) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient<Database, "public", PublicSchema>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const { data } = await supabase.auth.getUser();
  const isOnboarding = pathname.startsWith("/onboarding");

  if (!data.user && !isAuthRoute && !isPublicAsset) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (data.user && !isAuthRoute && !isOnboarding && !isPublicAsset) {
    const { data: profile } = await supabase.from("profiles").select("couple_id").eq("id", data.user.id).maybeSingle();
    if (!profile?.couple_id) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
