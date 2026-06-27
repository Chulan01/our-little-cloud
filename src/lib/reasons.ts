import { readFileSync } from "node:fs";
import path from "node:path";
import type { LoveReason } from "@/types/domain";

const START_DATE = "2026-06-08";
const REASONS_FILE = path.join(process.cwd(), "src", "data", "reasons.txt");

/**
 * Read once at module load. The file is small and rarely changes,
 * so caching avoids a blocking FS hit on every SSR request.
 */
const REASON_TEXTS: string[] = readFileSync(REASONS_FILE, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

export function relationshipStartDate(): string {
  return START_DATE;
}

export function getAllReasonTexts(): string[] {
  return REASON_TEXTS;
}

export function getDailyReason(date = new Date()): { day: number; text: string } {
  const reasons = REASON_TEXTS;
  const start = new Date(`${START_DATE}T00:00:00.000Z`);
  const current = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const rawDay = Math.max(1, Math.floor((current.getTime() - start.getTime()) / 86_400_000) + 1);
  const day = Math.min(rawDay, reasons.length || 365);
  const index = Math.min(day - 1, reasons.length - 1);
  return { day, text: reasons[index] ?? "За то, что ты есть." };
}

export function getSeedReasons(): LoveReason[] {
  return REASON_TEXTS.map((text, index) => ({
    id: `seed-reason-${index + 1}`,
    couple_id: "local-couple",
    author_id: "local-maxim",
    number: index + 1,
    text,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString()
  }));
}
