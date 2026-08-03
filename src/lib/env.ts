/** Supabase credentials are configured via public env. */
export function hasSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * supabase-js throws `Invalid path specified in request URL` when the base
 * URL contains anything but the bare origin — e.g. a pasted dashboard URL
 * (`…/project/xyz`), the REST path (`…/rest/v1`) or the auth path
 * (`…/auth/v1`). Normalise to the origin so a sloppy env var can't break
 * auth/data requests at runtime.
 */
export function normalizeSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  try {
    return new URL(raw).origin;
  } catch {
    return raw;
  }
}

/** True when running on Vercel serverless functions (fs is read-only). */
export function isVercelDeployment(): boolean {
  return process.env.VERCEL === "1";
}

/** True when running with NODE_ENV=production. */
export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

/** True when the local filesystem store must NOT be used (Vercel serverless). */
export function isLocalStoreDisabled(): boolean {
  return isVercelDeployment();
}

/**
 * Public base URL used for OAuth/email redirects and Supabase email links.
 *
 * Order of precedence:
 *   1. `NEXT_PUBLIC_SITE_URL` (explicit override, recommended)
 *   2. `VERCEL_PROJECT_PRODUCTION_URL` (production branch on Vercel)
 *   3. `NEXT_PUBLIC_VERCEL_URL` (preview/client-exposed build-time var on Vercel)
 *   4. `VERCEL_URL` (any Vercel deployment, runtime)
 *   5. `http://localhost:3000` (local dev only)
 *
 * On Vercel we refuse to silently fall back to localhost: Supabase uses the URL
 * we hand it as `emailRedirectTo`. A localhost URL silently sends the magic
 * link to the user's dev machine. Throwing surfaces the misconfig in logs.
 */
export function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return stripTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.VERCEL === "1") {
    throw new Error(
      "resolveSiteUrl: Vercel deployment is missing the public site URL. Set NEXT_PUBLIC_SITE_URL (or VERCEL_PROJECT_PRODUCTION_URL) in the project's environment variables, then redeploy."
    );
  }
  return "http://localhost:3000";
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
