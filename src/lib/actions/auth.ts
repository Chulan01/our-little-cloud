"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import { isLocalAuthEnabled, LOCAL_AUTH_COOKIE, verifyLocalUser } from "@/lib/local-auth";
import { signInSchema, type SignInInput } from "@/lib/validations/auth";
import { fail, logServerError, ok, validationError, type Result } from "@/lib/utils/errors";

export type LocalLoginInput = {
  login: string;
  password: string;
};

/** Signs in with local env credentials for private demo mode. */
export async function localLogin(input: LocalLoginInput): Promise<Result<{ login: string }>> {
  if (!isLocalAuthEnabled()) {
    return fail("SERVER", "Локальный вход не настроен.");
  }

  const user = verifyLocalUser(input.login, input.password);
  if (!user) {
    return fail("UNAUTHORIZED", "Неверный логин или пароль.");
  }

  cookies().set(LOCAL_AUTH_COOKIE, user.login, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return ok({ login: user.login });
}

/**
 * Signs the user into Supabase using email + password. Used on Vercel where
 * Maxim and Vika have pre-created accounts with static passwords.
 *
 * Returns a Result<{ email }>; navigation happens client-side via
 * `router.push("/")` so we mirror the existing `localLogin` flow.
 */
export async function signInWithPassword(input: SignInInput): Promise<Result<{ email: string }>> {
  if (!hasSupabaseEnv()) {
    return fail("SERVER", "Supabase не настроен — задай NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password
  });

  if (error || !data.user) {
    logServerError("signInWithPassword", error);
    // Most common failure modes at this stage:
    //   - "Invalid login credentials"         → wrong email or password
    //   - "Email not confirmed"               → admin must set email_confirmed_at
    //                                            in Supabase → Users (lock-down flow).
    //   - "Email logins are disabled"         → Auth → Providers → Email checkbox off.
    return fail("UNAUTHORIZED", "Не получилось войти. Проверь email и пароль или подтверди почту в Supabase.");
  }

  return ok({ email: data.user.email ?? parsed.data.email });
}

/** Signs the current user out and redirects to login. */
export async function signOut(): Promise<void> {
  if (!hasSupabaseEnv()) {
    cookies().delete(LOCAL_AUTH_COOKIE);
    redirect("/login");
  }

  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
