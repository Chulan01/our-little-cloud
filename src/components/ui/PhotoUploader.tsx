"use client";

import { ImagePlus } from "lucide-react";

export function PhotoUploader({ label = "Добавить фото" }: { label?: string }) {
  return (
    <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-petal/70 bg-white/50 p-5 text-center text-sm text-ink/65 transition hover:bg-white/75">
      <ImagePlus className="mb-2 h-7 w-7 text-petal" aria-hidden />
      {label}
      <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple />
    </label>
  );
}
