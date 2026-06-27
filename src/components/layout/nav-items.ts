import { BookHeart, GalleryHorizontalEnd, HeartHandshake, Home, LockKeyhole, MessageCircleHeart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

export const navItems: AppNavItem[] = [
  { href: "/", label: "Главная", shortLabel: "Дом", icon: Home },
  { href: "/memories", label: "Воспоминания", shortLabel: "Память", icon: BookHeart },
  { href: "/gallery", label: "Галерея", shortLabel: "Фото", icon: GalleryHorizontalEnd },
  { href: "/reasons", label: "365 причин", shortLabel: "Причины", icon: HeartHandshake },
  { href: "/counters", label: "Счетчики", shortLabel: "Счет", icon: LockKeyhole },
  { href: "/secret", label: "Тайная", shortLabel: "Тайна", icon: MessageCircleHeart }
];
