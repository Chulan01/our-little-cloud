"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { createCounter, deleteCounter, incrementCounter } from "@/lib/actions/counters";
import type { LoveCounter } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Counter } from "@/components/ui/Counter";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { CelebrationBurst } from "@/components/effects/CelebrationBurst";

export function CountersClient({ initialCounters, supabaseReady }: { initialCounters: LoveCounter[]; supabaseReady: boolean }) {
  const [message, setMessage] = useState("");
  const [burst, setBurst] = useState(0);
  const [isPending, startTransition] = useTransition();

  const changeCounter = (id: string, delta: number) => {
    startTransition(async () => {
      const result = await incrementCounter({ id, delta });
      if (result.ok && delta > 0) setBurst((value) => value + 1);
      setMessage(result.ok ? "Счетчик обновлен." : result.error.message);
    });
  };

  return (
    <div className="relative">
      <CelebrationBurst trigger={burst} />
      <form
        className="mb-6 grid gap-3 rounded-3xl bg-white/45 p-4 shadow-cloud sm:grid-cols-[90px_1fr_120px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          if (!supabaseReady) {
            setMessage("Сначала войди в аккаунт.");
            return;
          }
          const form = event.currentTarget;
          const formData = new FormData(form);
          startTransition(async () => {
            const result = await createCounter({
              emoji: String(formData.get("emoji") ?? "") || null,
              label: String(formData.get("label") ?? ""),
              value: 0,
              isAuto: false
            });
            if (result.ok) {
              form.reset();
              setBurst((value) => value + 1);
              setMessage("Счетчик добавлен.");
            } else {
              setMessage(result.error.message);
            }
          });
        }}
      >
        <Input name="emoji" placeholder="♡" maxLength={4} />
        <Input name="label" placeholder="Название счетчика" maxLength={40} required />
        <Button disabled={isPending || !supabaseReady}>Добавить</Button>
      </form>
      {initialCounters.length === 0 ? (
        <EmptyState title="Счетчиков пока нет" description="Добавь первый счетчик, например поцелуи, свидания или прогулки." />
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {initialCounters.map((counter) => {
            const mode = (counter.display_mode as "normal" | "days_since_anniversary" | "infinity" | null) ?? "normal";
            const poeticLine =
              mode === "infinity"
                ? counter.label === "Поцелуев"
                  ? "столько, сколько хочется повторять"
                  : "не измерить ни временем, ни расстоянием"
                : mode === "days_since_anniversary"
                  ? "с первого дня вместе"
                  : null;
            return (
            <Card key={counter.id} className="text-center">
              <div className={mode === "infinity" ? "text-3xl" : "text-4xl"}>{counter.emoji || "♡"}</div>
              <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-ink/55">{counter.label}</h2>
              <div className="my-5 font-display text-6xl text-ink">
                <Counter value={counter.computedValue ?? counter.value} />
              </div>
              {poeticLine ? (
                <p className="-mt-3 mb-5 text-sm leading-6 text-ink/60">{poeticLine}</p>
              ) : null}
              <div className="flex justify-center gap-2">
                {!counter.is_auto ? (
                  <>
                    <Button variant="soft" disabled={isPending} aria-label="Уменьшить" icon={<Minus className="h-4 w-4" aria-hidden />} onClick={() => changeCounter(counter.id, -1)} />
                    <Button variant="soft" disabled={isPending} aria-label="Увеличить" icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => changeCounter(counter.id, 1)} />
                    <Button
                      variant="ghost"
                      disabled={isPending}
                      aria-label="Удалить"
                      icon={<Trash2 className="h-4 w-4" aria-hidden />}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await deleteCounter({ id: counter.id });
                          setMessage(result.ok ? "Счетчик удален." : result.error.message);
                        });
                      }}
                    />
                  </>
                ) : null}
              </div>
            </Card>
            );
          })}
        </div>
      )}
      {message ? <p className="mt-4 text-center text-sm text-ink/65">{message}</p> : null}
    </div>
  );
}
