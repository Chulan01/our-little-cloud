"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Cloud, HeartHandshake } from "lucide-react";
import { createCouple, joinCouple } from "@/lib/auth/couple";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DatePicker, Input } from "@/components/ui/Input";
import { CelebrationBurst } from "@/components/effects/CelebrationBurst";

export function OnboardingForms() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [burst, setBurst] = useState(0);
  const [isPending, startTransition] = useTransition();
  const supabaseReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return (
    <div className="relative mt-8 grid w-full gap-4 sm:grid-cols-2">
      <CelebrationBurst trigger={burst} />
      <Card>
        <h2 className="font-display text-2xl text-ink">Создать пару</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!supabaseReady) {
              setMessage("Supabase пока не подключен. Добавь .env.local и перезапусти dev-сервер.");
              return;
            }
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await createCouple({
                name: String(formData.get("name") ?? ""),
                anniversaryDate: String(formData.get("anniversaryDate") ?? "") || null
              });
              if (result.ok) {
                setInviteCode(result.data.invite_code);
                setMessage("Готово. Код приглашения можно отправить партнеру.");
                setBurst((value) => value + 1);
                router.refresh();
              } else {
                setMessage(result.error.message);
              }
            });
          }}
        >
          <Input name="name" placeholder="Название пары" defaultValue="Наше Облачко" required />
          <DatePicker name="anniversaryDate" aria-label="Дата годовщины" />
          <Button className="w-full" disabled={isPending || !supabaseReady} icon={<Cloud className="h-4 w-4" aria-hidden />}>
            Создать облачко
          </Button>
        </form>
        {inviteCode ? <p className="mt-4 rounded-2xl bg-blush/70 p-3 text-sm text-ink">Код: <span className="font-semibold">{inviteCode}</span></p> : null}
      </Card>
      <Card>
        <h2 className="font-display text-2xl text-ink">Присоединиться</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!supabaseReady) {
              setMessage("Supabase пока не подключен. Добавь .env.local и перезапусти dev-сервер.");
              return;
            }
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await joinCouple({ inviteCode: String(formData.get("inviteCode") ?? "") });
              if (result.ok) {
                setMessage("Ты внутри вашего облачка.");
                setBurst((value) => value + 1);
                router.push("/");
                router.refresh();
              } else {
                setMessage(result.error.message);
              }
            });
          }}
        >
          <Input name="inviteCode" placeholder="Код приглашения" required />
          <Button className="w-full" variant="soft" disabled={isPending || !supabaseReady} icon={<HeartHandshake className="h-4 w-4" aria-hidden />}>
            Войти по коду
          </Button>
        </form>
        {message ? <p className="mt-4 text-sm leading-6 text-ink/70">{message}</p> : null}
      </Card>
    </div>
  );
}
