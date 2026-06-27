"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { addMemoryPhotos, createMemory, deleteMemory, type MemoryWithPhotos } from "@/lib/actions/memories";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DatePicker, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { CelebrationBurst } from "@/components/effects/CelebrationBurst";
import { formatDate } from "@/lib/utils";

function MemoryPlaceholder() {
  return (
    <div className="relative mb-4 flex h-48 w-full overflow-hidden rounded-3xl bg-gradient-to-br from-blush via-cream to-peach" aria-hidden>
      <div className="absolute left-8 top-7 h-20 w-20 rounded-full bg-white/55 blur-xl" />
      <div className="absolute bottom-6 right-6 h-24 w-24 rounded-full bg-petal/25 blur-2xl" />
      <div className="absolute inset-x-8 bottom-8 h-16 rounded-[999px] bg-white/40 blur-md" />
      <div className="m-auto font-script text-6xl text-petal/55">♡</div>
    </div>
  );
}

function selectedPhotoLabel(count: number) {
  if (count === 0) return "Добавить фото";
  if (count === 1) return "Выбрано 1 фото";
  if (count >= 2 && count <= 4) return `Выбрано ${count} фото`;
  return `Выбрано ${count} фото`;
}

export function MemoriesClient({
  initialMemories,
  supabaseReady,
  photoUploadReady
}: {
  initialMemories: MemoryWithPhotos[];
  supabaseReady: boolean;
  photoUploadReady: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedPhotoCount, setSelectedPhotoCount] = useState(0);
  const [burst, setBurst] = useState(0);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="relative">
      <CelebrationBurst trigger={burst} />
      <div className="mb-6 flex justify-center">
        <Button onClick={() => setOpen(true)} disabled={!supabaseReady}>Добавить воспоминание</Button>
      </div>
      {initialMemories.length === 0 ? (
        <EmptyState title="Пока тихо" description="Здесь появятся ваши первые настоящие воспоминания, когда вы добавите их через форму." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {initialMemories.map((memory) => (
            <Card key={memory.id} className="group transition hover:-translate-y-1">
              {memory.photos[0]?.signedUrl ? (
                <img src={memory.photos[0].signedUrl} alt={memory.title} className="mb-4 h-48 w-full rounded-3xl object-cover" />
              ) : (
                <MemoryPlaceholder />
              )}
              <p className="text-sm font-semibold text-petal">{formatDate(memory.memory_date)}</p>
              <h2 className="mt-2 font-display text-3xl text-ink">{memory.title}</h2>
              {memory.body ? <p className="mt-3 leading-7 text-ink/72">{memory.body}</p> : null}
              <Button
                className="mt-4"
                variant="ghost"
                disabled={isPending}
                icon={<Trash2 className="h-4 w-4" aria-hidden />}
                onClick={() => {
                  startTransition(async () => {
                    const result = await deleteMemory({ id: memory.id });
                    setMessage(result.ok ? "Воспоминание удалено." : result.error.message);
                    if (result.ok) router.refresh();
                  });
                }}
              >
                Удалить
              </Button>
            </Card>
          ))}
        </div>
      )}
      <Modal
        open={open}
        title="Новое воспоминание"
        onClose={() => {
          setOpen(false);
          setSelectedPhotoCount(0);
        }}
      >
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!supabaseReady) {
              setMessage("Сначала войди в аккаунт.");
              return;
            }

            const form = event.currentTarget;
            const formData = new FormData(form);
            const files = formData
              .getAll("photos")
              .filter((item): item is File => item instanceof File && item.size > 0)
              .slice(0, 8);

            startTransition(async () => {
              const result = await createMemory({
                memoryDate: String(formData.get("memoryDate") ?? ""),
                title: String(formData.get("title") ?? ""),
                body: String(formData.get("body") ?? "")
              });

              if (!result.ok) {
                setMessage(result.error.message);
                return;
              }

              if (files.length > 0 && photoUploadReady) {
                // Build a fresh FormData so each `File`'s binary content
                // survives the Server Action boundary intact. Passing
                // `File[]` directly used to silently strip the bodies.
                const photoFormData = new FormData();
                photoFormData.append("memoryId", result.data.id);
                for (const file of files) {
                  photoFormData.append("files", file);
                }
                const photoResult = await addMemoryPhotos(photoFormData);
                if (!photoResult.ok) {
                  setMessage(photoResult.error.message);
                  router.refresh();
                  return;
                }
              }

              setOpen(false);
              form.reset();
              setSelectedPhotoCount(0);
              setBurst((value) => value + 1);
              setMessage(
                files.length > 0 && !photoUploadReady
                  ? "Воспоминание сохранено. Фото не добавлялось, потому что облачное хранение пока не подключено."
                  : "Сохранено."
              );
              router.refresh();
            });
          }}
        >
          <DatePicker name="memoryDate" required />
          <Input name="title" placeholder="Название" maxLength={120} required />
          <Textarea name="body" placeholder="Что хочется запомнить?" maxLength={5000} />
          {photoUploadReady ? (
            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-petal/70 bg-white/50 p-5 text-center text-sm text-ink/65 transition hover:bg-white/75">
              <ImagePlus className="mb-2 h-7 w-7 text-petal" aria-hidden />
              <span>{selectedPhotoLabel(selectedPhotoCount)}</span>
              <span className="mt-1 text-xs text-ink/45">JPG, PNG или WebP, до 8 фото</span>
              <input
                className="sr-only"
                name="photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => setSelectedPhotoCount(event.currentTarget.files?.length ?? 0)}
              />
            </label>
          ) : (
            <div className="flex min-h-32 flex-col items-center justify-center rounded-3xl border border-dashed border-petal/40 bg-white/35 p-5 text-center text-sm text-ink/55">
              <ImagePlus className="mb-2 h-7 w-7 text-petal/70" aria-hidden />
              <span>Фото можно будет добавить после подключения облачного хранения</span>
              <span className="mt-1 text-xs text-ink/45">Так оно останется не на компьютере, а вместе с сайтом</span>
            </div>
          )}
          <Button className="w-full" disabled={isPending}>{isPending ? "Сохраняю..." : "Сохранить"}</Button>
        </form>
        {message ? <p className="mt-3 text-sm text-ink/70">{message}</p> : null}
      </Modal>
      {message && !open ? <p className="mt-4 text-center text-sm text-ink/65">{message}</p> : null}
    </div>
  );
}
