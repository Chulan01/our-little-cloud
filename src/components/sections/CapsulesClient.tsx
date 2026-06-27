"use client";

import { useState, useTransition } from "react";
import { Lock, MailOpen } from "lucide-react";
import { createCapsule, openCapsule, type CapsuleWithPhotos } from "@/lib/actions/capsules";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { CelebrationBurst } from "@/components/effects/CelebrationBurst";
import { formatDate } from "@/lib/utils";

export function CapsulesClient({ initialCapsules, supabaseReady }: { initialCapsules: CapsuleWithPhotos[]; supabaseReady: boolean }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [burst, setBurst] = useState(0);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="relative">
      <CelebrationBurst trigger={burst} />
      <div className="mb-6 flex justify-center">
        <Button onClick={() => setOpen(true)} disabled={!supabaseReady}>Создать капсулу</Button>
      </div>
      {initialCapsules.length === 0 ? (
        <EmptyState title="Капсул пока нет" description="Создай письмо в будущее. До даты открытия его текст никуда не уйдет и будет ждать своего дня." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {initialCapsules.map((capsule) => (
            <Card key={capsule.id} className="min-h-64">
              {capsule.can_open ? <MailOpen className="mb-4 h-8 w-8 text-petal" aria-hidden /> : <Lock className="mb-4 h-8 w-8 text-petal" aria-hidden />}
              <p className="text-sm font-semibold text-petal">{formatDate(capsule.open_at)}</p>
              <h2 className="mt-2 font-display text-3xl text-ink">{capsule.title}</h2>
              <p className="mt-4 leading-7 text-ink/72">{capsule.body ?? "Запечатано. Это письмо откроется в свой день."}</p>
              {capsule.can_open && !capsule.is_opened ? (
                <Button
                  className="mt-5"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await openCapsule({ id: capsule.id });
                      if (result.ok) setBurst((value) => value + 1);
                      setMessage(result.ok ? "Капсула открыта." : result.error.message);
                    });
                  }}
                >
                  Открыть
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      )}
      <Modal open={open} title="Новая капсула" onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!supabaseReady) {
              setMessage("Сейчас капсулу не получилось сохранить. Попробуй еще раз чуть позже.");
              return;
            }
            const formData = new FormData(event.currentTarget);
            const localDate = String(formData.get("openAt") ?? "");
            startTransition(async () => {
              const result = await createCapsule({
                title: String(formData.get("title") ?? ""),
                body: String(formData.get("body") ?? ""),
                openAt: localDate ? new Date(localDate).toISOString() : "",
                files: []
              });
              if (result.ok) {
                setOpen(false);
                setBurst((value) => value + 1);
                setMessage("Капсула запечатана.");
              } else {
                setMessage(result.error.message);
              }
            });
          }}
        >
          <Input name="title" placeholder="Название" required />
          <Textarea name="body" placeholder="Письмо в будущее" required />
          <Input name="openAt" type="datetime-local" required />
          <Button className="w-full" disabled={isPending}>{isPending ? "Запечатываю..." : "Запечатать"}</Button>
        </form>
        {message ? <p className="mt-3 text-sm text-ink/70">{message}</p> : null}
      </Modal>
      {message && !open ? <p className="mt-4 text-center text-sm text-ink/65">{message}</p> : null}
    </div>
  );
}
