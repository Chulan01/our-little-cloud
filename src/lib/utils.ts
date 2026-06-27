import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { anniversaryStart } from "./reasons";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
}

/**
 * Whole days between an anniversary date and `to`. The anniversary string is
 * interpreted as 00:00 in the couple's local timezone (see
 * `anniversaryStart`) so the counter ticks over at local midnight, not
 * 3 hours earlier in UTC.
 */
export function daysBetween(from: string, to = new Date()): number {
  const start = anniversaryStart(from);
  const diff = to.getTime() - start.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}
