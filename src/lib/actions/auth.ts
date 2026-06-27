"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv, resolveSiteUrl } from "@/lib/env";
import { isLocalAuthEnabled, LOCAL_AUTH_COOKIE, verifyLocalUser } from "@/lib/local-auth";
import { fail, logServerError, ok, type Result } from "@/lib/utils/errors";

export type MagicLinkInput = {
  email: string;
};

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

/** Sends a Supabase magic link to the provided email. */
export async function sendMagicLink(input: MagicLinkInput): Promise<Result<{ email: string }>> {
  if (!hasSupabaseEnv()) {
    return fail("SERVER", "Supabase не настроен: добавь NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.local.");
  }

  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail("VALIDATION", "Введите корректный email.");
  }

  const supabase = createClient();
  const siteUrl = resolveSiteUrl();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/callback`
    }
  });

  if (error) {
    logServerError("sendMagicLink", error);
    return fail("SERVER", "Не получилось отправить magic link.");
  }

  return ok({ email });
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
