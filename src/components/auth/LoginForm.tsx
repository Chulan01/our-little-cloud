"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { localLogin, signInWithPassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CelebrationBurst } from "@/components/effects/CelebrationBurst";

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [burst, setBurst] = useState(0);
  const [isPending, startTransition] = useTransition();
  const supabaseReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const localAuthReady = process.env.NEXT_PUBLIC_LOCAL_AUTH_ENABLED === "true";

  // On Vercel we use Supabase email+password (Maxim & Vika pre-created accounts).
  // Local self-host mode keeps the env-driven username+password form.
  const showPasswordForm = supabaseReady;
  const showLocalLogin = localAuthReady && !supabaseReady;

  return (
    <form
      className="relative mt-8 w-full space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        if (showLocalLogin) {
          startTransition(async () => {
            const result = await localLogin({
              login: String(formData.get("login") ?? ""),
              password: String(formData.get("password") ?? "")
            });
            if (result.ok) {
              setMessage("Входим...");
              setBurst((value) => value + 1);
              router.push("/");
              router.refresh();
            } else {
              setMessage(result.error.message);
            }
          });
          return;
        }

        if (showPasswordForm) {
          startTransition(async () => {
            const result = await signInWithPassword({
              email: String(formData.get("email") ?? ""),
              password: String(formData.get("password") ?? "")
            });
            if (result.ok) {
              setMessage("Входим...");
              setBurst((value) => value + 1);
              router.push("/");
              router.refresh();
            } else {
              setMessage(result.error.message);
            }
          });
          return;
        }

        // Neither auth backend is configured. Surface a clear config-side error
        // instead of a dead magic-link button which Supabase would reject under
        // our lock-down anyway ("Allow new users to sign up = OFF").
        setMessage("Сервер не настроен: задай NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в Vercel или .env.local.");
      }}
    >
      <CelebrationBurst trigger={burst} />
      {showLocalLogin ? (
        <>
          <Input name="login" placeholder="Логин" autoComplete="username" required />
          <Input name="password" type="password" placeholder="Пароль" autoComplete="current-password" required />
          <Button className="w-full" disabled={isPending} icon={<KeyRound className="h-4 w-4" aria-hidden />}>
            {isPending ? "Вхожу..." : "Войти"}
          </Button>
        </>
      ) : showPasswordForm ? (
        <>
          <Input
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <Input
            name="password"
            type="password"
            placeholder="Пароль"
            autoComplete="current-password"
            minLength={6}
            required
          />
          <Button
            className="w-full"
            disabled={isPending}
            icon={<KeyRound className="h-4 w-4" aria-hidden />}
          >
            {isPending ? "Вхожу..." : "Войти"}
          </Button>
        </>
      ) : null}
      {message ? <p className="text-sm leading-6 text-ink/70">{message}</p> : null}
    </form>
  );
}
