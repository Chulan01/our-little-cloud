"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail } from "lucide-react";
import { localLogin, sendMagicLink } from "@/lib/actions/auth";
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

  return (
    <form
      className="relative mt-8 w-full space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        if (localAuthReady && !supabaseReady) {
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

        startTransition(async () => {
          const result = await sendMagicLink({ email: String(formData.get("email") ?? "") });
          if (result.ok) {
            setMessage("Письмо отправлено. Проверь почту и открой magic link.");
            setBurst((value) => value + 1);
          } else {
            setMessage(result.error.message);
          }
        });
      }}
    >
      <CelebrationBurst trigger={burst} />
      {localAuthReady && !supabaseReady ? (
        <>
          <Input name="login" placeholder="Логин" autoComplete="username" required />
          <Input name="password" type="password" placeholder="Пароль" autoComplete="current-password" required />
          <Button className="w-full" disabled={isPending} icon={<KeyRound className="h-4 w-4" aria-hidden />}>
            {isPending ? "Вхожу..." : "Войти"}
          </Button>
        </>
      ) : (
        <>
          <Input name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
          <Button className="w-full" disabled={isPending} icon={<Mail className="h-4 w-4" aria-hidden />}>
            {isPending ? "Отправляю..." : "Получить magic link"}
          </Button>
        </>
      )}
      {message ? <p className="text-sm leading-6 text-ink/70">{message}</p> : null}
    </form>
  );
}
