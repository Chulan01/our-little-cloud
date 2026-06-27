import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type RequiredUser = {
  id: string;
  email?: string;
};

export type RequiredCouple = {
  user: RequiredUser;
  coupleId: string;
};

/** Requires an authenticated Supabase user or redirects to login. */
export async function requireUser(): Promise<RequiredUser> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  return {
    id: data.user.id,
    email: data.user.email
  };
}

/** Requires a user profile bound to a couple or redirects to onboarding. */
export async function requireCouple(): Promise<RequiredCouple> {
  const user = await requireUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("couple_id")
    .eq("id", user.id)
    .single();

  if (error || !data?.couple_id) {
    redirect("/onboarding");
  }

  return { user, coupleId: data.couple_id };
}
