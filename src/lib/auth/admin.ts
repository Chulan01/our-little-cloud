import { cookies } from "next/headers";
import { hasSupabaseEnv } from "@/lib/env";
import { LOCAL_AUTH_COOKIE, isLocalAuthEnabled } from "@/lib/local-auth";
import { createClient } from "@/lib/supabase/server";
import { isUnlocked } from "@/lib/unlock";

/**
 * The single account allowed to edit content (map spots, story timeline,
 * everything in the admin panel). Overridable via env so the address never
 * needs a code change.
 */
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "maksiakimov123@gmail.com").toLowerCase();

/** True when the current session belongs to the admin account. */
export async function isAdmin(): Promise<boolean> {
  if (hasSupabaseEnv()) {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email?.toLowerCase();
    return Boolean(email && email === ADMIN_EMAIL);
  }

  if (isLocalAuthEnabled()) {
    // Local demo mode: the "максим" login is the site builder.
    const login = cookies().get(LOCAL_AUTH_COOKIE)?.value?.trim().toLowerCase();
    return login === "максим";
  }

  return false;
}

export type SiteAccess = {
  /** Sections are open for everyone (8 July has arrived). */
  unlocked: boolean;
  /** The current user is the admin (sees and edits everything early). */
  admin: boolean;
  /** Sections should render for this specific viewer. */
  canView: boolean;
};

/** Combined gate used by every "surprise" section page. */
export async function getSiteAccess(): Promise<SiteAccess> {
  const [admin, unlocked] = [await isAdmin(), isUnlocked()];
  return { unlocked, admin, canView: unlocked || admin };
}
