import { readFileSync } from "node:fs";
import path from "node:path";
import type { LoveReason } from "@/types/domain";

const START_DATE = "2026-06-08";
const REASONS_FILE = path.join(process.cwd(), "src", "data", "reasons.txt");

// The couple is in Moscow (UTC+3). We treat the anniversary as "00:00 local
// time" so the day counter rolls over when they wake up on the morning of
// 8 June, not 3 hours earlier in UTC. If the couple ever moves timezones,
// change this single constant.
const RELATIONSHIP_TZ_OFFSET_MS = 3 * 60 * 60 * 1000;

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

/**
 * Parses a YYYY-MM-DD anniversary string as 00:00 in the couple's local
 * timezone (Moscow) and returns the corresponding absolute `Date`.
 *
 * The DB stores `anniversary_date` as a date-only column, so we attach the
 * explicit `+03:00` offset rather than letting `new Date("2026-06-08")`
 * default to UTC midnight — otherwise the day counter would tick over 3
 * hours before the couple's local midnight.
 */
export function anniversaryStart(anniversaryDate: string = START_DATE): Date {
  return new Date(`${anniversaryDate}T00:00:00+03:00`);
}

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
