"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { MapPin, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { createSpot, deleteSpot, updateSpot } from "@/lib/actions/spots";
import { pushToast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/Card";
import { DatePicker, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { DateSpotWithPhoto } from "@/types/domain";

const showToast = (title: string) => pushToast({ title });

const SpotMap = dynamic(() => import("@/components/map/SpotMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] w-full items-center justify-center rounded-3xl bg-white/50 text-ink/60">
      облачко рисует карту...
    </div>
  )
});

type SpotFormState = {
  id: string | null;
  lat: number;
  lng: number;
  title: string;
  body: string;
  spotDate: string;
  photoUrl: string;
};

const emptyForm = (lat: number, lng: number): SpotFormState => ({
  id: null,
  lat,
  lng,
  title: "",
  body: "",
  spotDate: "",
  photoUrl: ""
});

export function MapClient({ spots, isAdmin }: { spots: DateSpotWithPhoto[]; isAdmin: boolean }) {
  const router = useRouter();
  const [pickMode, setPickMode] = useState(false);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState<SpotFormState | null>(null);
  const [pending, startTransition] = useTransition();

  const handlePick = (lat: number, lng: number) => {
    if (!isAdmin || !pickMode) return;
    setDraft({ lat, lng });
    setForm(emptyForm(lat, lng));
  };

  const closeForm = () => {
    setForm(null);
    setDraft(null);
    setPickMode(false);
  };

  const handleEdit = (spot: DateSpotWithPhoto) => {
    setForm({
      id: spot.id,
      lat: spot.lat,
      lng: spot.lng,
      title: spot.title,
      body: spot.body,
      spotDate: spot.spot_date ?? "",
      photoUrl: spot.photo_url ?? ""
    });
  };

  const handleDelete = (spot: DateSpotWithPhoto) => {
    if (!window.confirm(`Удалить место «${spot.title}»?`)) return;
    startTransition(async () => {
      const result = await deleteSpot({ id: spot.id });
      if (result.ok) {
        showToast("Место удалено.");
        router.refresh();
      } else {
        showToast(result.error.message);
      }
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;

    const payload = {
      title: form.title,
      body: form.body,
      lat: form.lat,
      lng: form.lng,
      spotDate: form.spotDate || null,
      photoUrl: form.photoUrl.trim() || null
    };

    startTransition(async () => {
      const result = form.id ? await updateSpot({ ...payload, id: form.id }) : await createSpot(payload);
      if (result.ok) {
        showToast(form.id ? "Место обновлено." : "Новое место добавлено на карту.");
        closeForm();
        router.refresh();
      } else {
        showToast(result.error.message);
      }
    });
  };

  return (
    <div className="space-y-4">
      {isAdmin ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant={pickMode ? "primary" : "soft"}
            icon={pickMode ? <X className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
            onClick={() => {
              setPickMode((value) => !value);
              setDraft(null);
            }}
          >
            {pickMode ? "Отменить добавление" : "Добавить место"}
          </Button>
          <AnimatePresence>
            {pickMode ? (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="rounded-full bg-white/70 px-4 py-2 text-sm text-ink/70 shadow-cloud"
              >
                нажми на карту там, где было ваше место
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}

      <GlassCard className="overflow-hidden p-1.5 sm:p-2">
        <div className="h-[60vh] min-h-[480px] w-full overflow-hidden rounded-[1.25rem]">
          <SpotMap
            spots={spots}
            isAdmin={isAdmin}
            onPick={pickMode ? handlePick : undefined}
            draft={draft}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </GlassCard>

      {spots.length === 0 ? (
        <p className="text-center text-sm text-ink/60">
          <MapPin className="mr-1 inline h-4 w-4 text-petal" aria-hidden />
          скоро здесь появятся сердечки — места, где вы были вместе
        </p>
      ) : (
        <p className="text-center text-sm text-ink/60">
          {'сердечек на карте: '}
          {spots.length}
          {' — нажми на любое, чтобы вспомнить'}
        </p>
      )}

      <Modal open={Boolean(form)} title={form?.id ? "Изменить место" : "Новое место"} onClose={closeForm}>
        {form ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm font-medium text-ink/70">
              Название
              <Input
                className="mt-1"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="например: скамейка у театра"
                required
                maxLength={120}
              />
            </label>
            <label className="block text-sm font-medium text-ink/70">
              История этого места
              <Textarea
                className="mt-1"
                value={form.body}
                onChange={(event) => setForm({ ...form, body: event.target.value })}
                placeholder="что здесь случилось и почему оно важное"
                required
                maxLength={2000}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink/70">
                Дата (необязательно)
                <DatePicker className="mt-1" value={form.spotDate} onChange={(event) => setForm({ ...form, spotDate: event.target.value })} />
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
            </div>
            <p className="text-xs text-ink/50">
              координаты: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={closeForm}>
                Отмена
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Сохраняю..." : form.id ? "Сохранить" : "Добавить на карту"}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
