"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { markAsRead, sendMessage } from "@/lib/actions/messages";
import type { Profile, SecretMessage } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { CelebrationBurst } from "@/components/effects/CelebrationBurst";

export function SecretClient({
  messages,
  currentUserId,
  partner,
  supabaseReady
}: {
  messages: SecretMessage[];
  currentUserId: string | null;
  partner: Profile | null;
  supabaseReady: boolean;
}) {
  const [notice, setNotice] = useState("");
  const [burst, setBurst] = useState(0);
  const [isPending, startTransition] = useTransition();
  const canSend = Boolean(currentUserId && partner && supabaseReady);

  return (
    <Card className="relative space-y-4">
      <CelebrationBurst trigger={burst} />
      {messages.length === 0 ? (
        <EmptyState title="Здесь пока тихо" description="Первое настоящее сообщение появится здесь, когда один из вас его отправит." />
      ) : (
        messages.map((message) => {
          const mine = message.sender_id === currentUserId;
          return (
            <div key={message.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <button
                type="button"
                disabled={mine || message.is_read || !message.is_revealed || isPending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await markAsRead({ id: message.id });
                    // `markAsRead` already calls `revalidatePath("/", "layout")`,
                    // which makes Next.js re-render the navbar / bottom-tab with
                    // the new unread count without a second client-side fetch.
                    setNotice(result.ok ? "Отмечено прочитанным." : result.error.message);
                  });
                }}
                className={
                  mine
                    ? "max-w-[80%] rounded-3xl rounded-br-md bg-petal px-5 py-3 text-left text-white shadow-cloud"
                    : "max-w-[80%] rounded-3xl rounded-bl-md bg-cream px-5 py-3 text-left text-ink shadow-cloud"
                }
              >
                {message.body ?? "Сообщение пока закрыто"}
                {message.is_read ? <span className="ml-2 text-xs opacity-80">♡</span> : null}
              </button>
            </div>
          );
        })
      )}
      <form
        className="grid gap-2 pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!supabaseReady) {
            setNotice("Вход еще не активен.");
            return;
          }
          if (!partner) {
            setNotice("Не найден второй человек в паре.");
            return;
          }
          const form = event.currentTarget;
          const formData = new FormData(form);
          startTransition(async () => {
            const result = await sendMessage({
              recipientId: partner.id,
              body: String(formData.get("body") ?? ""),
              revealAt: null
            });
            if (result.ok) {
              form.reset();
              setBurst((value) => value + 1);
              setNotice("Сообщение отправлено.");
            } else {
              setNotice(result.error.message);
            }
          });
        }}
      >
        <Textarea name="body" placeholder={canSend ? `Написать для ${partner?.display_name ?? "партнера"}...` : "Сначала войди в аккаунт"} maxLength={2000} disabled={!canSend} required />
        <Button className="justify-self-end" disabled={!canSend || isPending} icon={<Send className="h-4 w-4" aria-hidden />}>
          {isPending ? "Отправляю..." : "Отправить"}
        </Button>
      </form>
      {notice ? <p className="text-center text-sm text-ink/65">{notice}</p> : null}
    </Card>
  );
}
