// Client-safe timezone helpers. Kept in a separate file (no Node imports)
// because `utils.ts` and other client-reachable modules need
// `anniversaryStart` without dragging in `reasons.ts` (which reads
// `reasons.txt` via `node:fs` at module load).

export const START_DATE = "2026-06-08";

// The couple is in Moscow (UTC+3). We treat the anniversary as "00:00 local
// time" so the day counter rolls over when they wake up on the morning of
// 8 June, not 3 hours earlier in UTC. If the couple ever moves timezones,
// change this single constant.
export const RELATIONSHIP_TZ_OFFSET_MS = 3 * 60 * 60 * 1000;

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
