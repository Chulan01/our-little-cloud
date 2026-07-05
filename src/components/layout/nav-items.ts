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
 * Routes hidden from the nav entirely. "Наша история" is intentionally NOT
 * hidden — it stays visible as a teasing locked tab (countdown + "секретик"),
 * while access to its content is gated on the page itself until 8 July.
 * The list is kept for future use; currently empty so every tab is shown.
 */
export const LOCKED_HREFS: string[] = [];

/** The nav shown to a given viewer. */
export function visibleNavItems(canViewAll: boolean): AppNavItem[] {
  if (canViewAll) return navItems;
  return navItems.filter((item) => !LOCKED_HREFS.includes(item.href));
}
