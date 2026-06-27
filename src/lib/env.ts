/** Supabase credentials are configured via public env. */
export function hasSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
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
 * Public base URL used for OAuth/email redirects.
 * Order of precedence: explicit env var > Vercel production > Vercel preview > localhost.
 */
export function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return stripTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
