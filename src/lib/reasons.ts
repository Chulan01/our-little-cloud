import { readFileSync } from "node:fs";
import path from "node:path";
import type { LoveReason } from "@/types/domain";
import { RELATIONSHIP_TZ_OFFSET_MS, anniversaryStart } from "./timezone";

const REASONS_FILE = path.join(process.cwd(), "src", "data", "reasons.txt");

/**
 * Read once at module load. The file is small and rarely changes,
 * so caching avoids a blocking FS hit on every SSR request.
 */
const REASON_TEXTS: string[] = readFileSync(REASONS_FILE, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

export function getAllReasonTexts(): string[] {
  return REASON_TEXTS;
}

export function getDailyReason(date = new Date()): { day: number; text: string } {
  const reasons = REASON_TEXTS;
  const start = anniversaryStart();
  // Compute "today" in Moscow time so the day number follows the same
  // boundary the user sees on the home counter.
  const nowMs = date.getTime() + RELATIONSHIP_TZ_OFFSET_MS;
  const mskMidnightToday = new Date(nowMs - (nowMs % 86_400_000));
  const rawDay = Math.floor((mskMidnightToday.getTime() - start.getTime()) / 86_400_000) + 1;
  const safeDay = Math.max(1, rawDay);
  const index = Math.min(safeDay - 1, Math.max(0, reasons.length - 1));
  return { day: safeDay, text: reasons[index] ?? "За то, что ты есть." };
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
