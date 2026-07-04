import { BookHeart, GalleryHorizontalEnd, HeartHandshake, Home, LockKeyhole, MapPin, MessageCircleHeart, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

export const navItems: AppNavItem[] = [
  { href: "/", label: "Главная", shortLabel: "Дом", icon: Home },
  { href: "/map", label: "Карта", shortLabel: "Карта", icon: MapPin },
  { href: "/story", label: "История", shortLabel: "История", icon: Sparkles },
  { href: "/memories", label: "Воспоминания", shortLabel: "Память", icon: BookHeart },
  { href: "/gallery", label: "Галерея", shortLabel: "Фото", icon: GalleryHorizontalEnd },
  { href: "/reasons", label: "365 причин", shortLabel: "Причины", icon: HeartHandshake },
  { href: "/counters", label: "Счетчики", shortLabel: "Счет", icon: LockKeyhole },
  { href: "/secret", label: "Тайная", shortLabel: "Тайна", icon: MessageCircleHeart }
];

/**
 * Routes visible before the 8 July reveal. Everything else is a "surprise"
 * section whose label would spoil the gift, so we hide those from the nav
 * until the site unlocks (or for the admin, who always sees everything).
 */
export const PUBLIC_HREFS = ["/", "/map"] as const;

/** The nav shown to a given viewer. */
export function visibleNavItems(canViewAll: boolean): AppNavItem[] {
  if (canViewAll) return navItems;
  return navItems.filter((item) => PUBLIC_HREFS.includes(item.href as (typeof PUBLIC_HREFS)[number]));
}
