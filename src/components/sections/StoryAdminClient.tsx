"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { createStoryEvent, deleteStoryEvent, updateStoryEvent } from "@/lib/actions/story";
import { pushToast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/Card";
import { DatePicker, Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import type { StoryEventWithPhoto } from "@/types/domain";

const toast = (title: string) => pushToast({ title });

type FormState = {
  id: string | null;
  eventDate: string;
  title: string;
  body: string;
  emoji: string;
  photoUrl: string;
};

const emptyForm: FormState = { id: null, eventDate: "", title: "", body: "", emoji: "", photoUrl: "" };

export function StoryAdminClient({ events }: { events: StoryEventWithPhoto[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [pending, startTransition] = useTransition();

  const startCreate = () => setForm({ ...emptyForm });
  const startEdit = (event: StoryEventWithPhoto) =>
    setForm({
      id: event.id,
      eventDate: event.event_date,
      title: event.title,
      body: event.body,
      emoji: event.emoji ?? "",
      photoUrl: event.photo_url ?? ""
    });

  const handleDelete = (event: StoryEventWithPhoto) => {
    if (!window.confirm(`Удалить событие «${event.title}»?`)) return;
    startTransition(async () => {
      const result = await deleteStoryEvent({ id: event.id });
      toast(result.ok ? "Событие удалено." : result.error.message);
      if (result.ok) router.refresh();
    });
  };

  const handleSubmit = (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    if (!form) return;
    const payload = {
      eventDate: form.eventDate,
      title: form.title,
      body: form.body,
      emoji: form.emoji.trim() || null,
      photoUrl: form.photoUrl.trim() || null
    };
    startTransition(async () => {
      const result = form.id ? await updateStoryEvent({ ...payload, id: form.id }) : await createStoryEvent(payload);
      if (result.ok) {
        toast(form.id ? "Событие обновлено." : "Событие добавлено в историю.");
        setForm(null);
        router.refresh();
      } else {
        toast(result.error.message);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-ink">Наша история</h2>
        {form ? (
          <Button variant="ghost" icon={<X className="h-4 w-4" aria-hidden />} onClick={() => setForm(null)}>
            Закрыть форму
          </Button>
        ) : (
          <Button icon={<Plus className="h-4 w-4" aria-hidden />} onClick={startCreate}>
            Новое событие
          </Button>
        )}
      </div>

      {form ? (
        <GlassCard className="px-5 py-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink/70">
                Дата события
                <DatePicker
                  className="mt-1"
                  value={form.eventDate}
                  onChange={(event) => setForm({ ...form, eventDate: event.target.value })}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-ink/70">
                Эмодзи (необязательно)
                <Input
                  className="mt-1"
                  value={form.emoji}
                  onChange={(event) => setForm({ ...form, emoji: event.target.value })}
                  placeholder="например: 💌"
                  maxLength={4}
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-ink/70">
              Заголовок
              <Input
                className="mt-1"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="например: первое сообщение"
                required
                maxLength={120}
              />
            </label>
            <label className="block text-sm font-medium text-ink/70">
              Описание
              <Textarea
                className="mt-1"
                value={form.body}
                onChange={(event) => setForm({ ...form, body: event.target.value })}
                placeholder="как это было"
                required
                maxLength={2000}
              />
            </label>
            <label className="block text-sm font-medium text-ink/70">
              Ссылка на фото (необязательно)
              <Input
                className="mt-1"
                type="url"
                value={form.photoUrl}
                onChange={(event) => setForm({ ...form, photoUrl: event.target.value })}
                placeholder="https://..."
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                Отмена
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Сохраняю..." : form.id ? "Сохранить" : "Добавить"}
              </Button>
            </div>
          </form>
        </GlassCard>
      ) : null}

      {events.length === 0 ? (
        <EmptyState title="Событий пока нет" description="Добавь первое событие вашей истории — с него начнётся хронология." />
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={event.id}>
              <GlassCard className="flex items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-petal">{formatDate(event.event_date)}</p>
                  <p className="mt-0.5 font-display text-lg text-ink">
                    {event.emoji ? <span className="mr-1">{event.emoji}</span> : null}
                    {event.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink/70">{event.body}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => startEdit(event)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-petal shadow-cloud transition hover:bg-white"
                    aria-label={`Изменить ${event.title}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(event)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-blush text-petal shadow-cloud transition hover:brightness-105"
                    aria-label={`Удалить ${event.title}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </GlassCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
