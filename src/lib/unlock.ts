// Client-safe unlock helpers for the "1 month" anniversary reveal.
//
// Most sections of the site stay hidden behind a gentle "surprise" lock
// until 8 July — the couple's first month together. The unlock moment is
// 00:00 in the couple's local timezone (see `timezone.ts` for rationale).

export const UNLOCK_DATE = "2026-07-08";

/** Absolute timestamp (ms) when the surprise sections open. */
export function unlockAtMs(): number {
  return new Date(`${UNLOCK_DATE}T00:00:00+03:00`).getTime();
}

/** True once the anniversary moment has arrived. */
export function isUnlocked(now: number = Date.now()): boolean {
  return now >= unlockAtMs();
}
