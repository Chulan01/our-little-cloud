"use client";

import { useState, useTransition } from "react";
import { Heart, Trash2 } from "lucide-react";
import { addReason, deleteReason } from "@/lib/actions/reasons";
import type { LoveReason } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { CelebrationBurst } from "@/components/effects/CelebrationBurst";

export function ReasonsClient({ initialReasons, supabaseReady }: { initialReasons: LoveReason[]; supabaseReady: boolean }) {
  const [message, setMessage] = useState("");
  const [burst, setBurst] = useState(0);
  const [isPending, startTransition] = useTransition();
  const progress = Math.round((initialReasons.length / 365) * 100);

  return (
    <div className="relative">
      <CelebrationBurst trigger={burst} />
      <Card className="mb-6">
        <div className="flex items-center justify-between text-sm font-semibold text-ink">
          <span>{initialReasons.length} из 365</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-3 h-3 rounded-full bg-white">
          <div className="h-full rounded-full bg-petal transition-all" style={{ width: `${progress}%` }} />
        </div>
      </Card>
      {initialReasons.length < 365 ? (
        <form
          className="mb-6 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (!supabaseReady) {
              setMessage("Supabase пока не подключен. Добавь .env.local и перезапусти dev-сервер.");
              return;
            }
            const form = event.currentTarget;
            const formData = new FormData(form);
            startTransition(async () => {
              const result = await addReason({ text: String(formData.get("text") ?? "") });
              if (result.ok) {
                form.reset();
                setMessage("Причина добавлена.");
                setBurst((value) => value + 1);
              } else {
                setMessage(result.error.message);
              }
            });
          }}
        >
          <Input name="text" placeholder="Еще одна причина..." maxLength={280} required />
          <Button disabled={isPending || !supabaseReady} icon={<Heart className="h-4 w-4" aria-hidden />}>{isPending ? "..." : "Добавить"}</Button>
        </form>
      ) : null}
      {initialReasons.length === 0 ? (
        <EmptyState title="Список ждет первую причину" description="Добавь первую настоящую причину, и она появится здесь под номером 1." />
      ) : (
        <div className="grid gap-4">
          {initialReasons.map((reason) => (
            <Card key={reason.id} className="flex items-start gap-3 sm:gap-5">
              <div className="shrink-0 font-display text-3xl text-petal sm:text-4xl">{reason.number}</div>
              <p className="min-w-0 flex-1 pt-1 leading-7 text-ink/75 sm:pt-2">{reason.text}</p>
              <Button
                variant="ghost"
                className="shrink-0 px-3 sm:px-5"
                aria-label="Удалить причину"
                disabled={isPending}
                icon={<Trash2 className="h-4 w-4" aria-hidden />}
                onClick={() => {
                  startTransition(async () => {
                    const result = await deleteReason({ id: reason.id });
                    setMessage(result.ok ? "Удалено." : result.error.message);
                  });
                }}
              />
            </Card>
          ))}
        </div>
      )}
      {message ? <p className="mt-4 text-center text-sm text-ink/65">{message}</p> : null}
    </div>
  );
}
