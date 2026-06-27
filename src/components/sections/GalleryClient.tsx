"use client";

import { motion } from "framer-motion";
import { Images } from "lucide-react";
import type { MemoryWithPhotos } from "@/lib/actions/memories";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

const placeholderNotes = [
  "место для вашего первого кадра",
  "тут скоро будет улыбка",
  "кадр, который еще ждет облако",
  "маленький будущий полароид"
];

function GalleryPlaceholder({ index }: { index: number }) {
  return (
    <motion.div
      className="relative min-h-72 overflow-hidden rounded-3xl bg-gradient-to-br from-blush via-cream to-peach p-5 shadow-cloud ring-1 ring-white/70"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="absolute left-6 top-6 h-24 w-24 rounded-full bg-white/45 blur-2xl" />
      <div className="absolute bottom-8 right-8 h-28 w-28 rounded-full bg-petal/25 blur-2xl" />
      <div className="relative flex h-full min-h-60 flex-col items-center justify-center rounded-2xl border border-white/60 bg-white/28 text-center">
        <Images className="mb-4 h-10 w-10 text-petal" aria-hidden />
        <p className="font-script text-3xl text-ink/65">{placeholderNotes[index % placeholderNotes.length]}</p>
      </div>
    </motion.div>
  );
}

export function GalleryClient({ memories }: { memories: MemoryWithPhotos[] }) {
  const photos = memories.flatMap((memory) =>
    memory.photos.map((photo) => ({
      id: photo.id,
      url: photo.signedUrl,
      title: memory.title,
      date: memory.memory_date
    }))
  );

  if (photos.length === 0) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <GalleryPlaceholder key={index} index={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
      {photos.map((photo, index) => (
        <motion.div
          key={photo.id}
          className="mb-5 break-inside-avoid"
          initial={{ opacity: 0, y: 16, rotate: index % 2 === 0 ? -1 : 1 }}
          animate={{ opacity: 1, y: 0, rotate: index % 2 === 0 ? -0.35 : 0.35 }}
          transition={{ delay: index * 0.04 }}
        >
          <Card className="p-3">
            <img src={photo.url} alt={photo.title} className="aspect-[4/5] w-full rounded-2xl object-cover" />
            <div className="px-2 pb-2 pt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-petal">{formatDate(photo.date)}</p>
              <h2 className="mt-1 font-script text-3xl text-ink">{photo.title}</h2>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
