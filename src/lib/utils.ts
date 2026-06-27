import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
}

export function daysBetween(from: string, to = new Date()): number {
  const start = new Date(from);
  const diff = to.getTime() - start.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}
