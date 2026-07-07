/**
 * Automatic seasonal theming.
 *
 * The site keeps its signature pink palette all year round — only the
 * *accent* colours (decorative glows, floating hearts, background aurora and
 * the dotted lattice) shift with the seasons. All of the actual colour values
 * live in `globals.css` under `[data-season="…"]` selectors; this module's
 * only job is to figure out which season we're in and expose a tiny, typed
 * description of each palette for documentation / potential future use.
 *
 * Adding a new season later is a two-step change:
 *   1. add an entry to `SEASON_COLORS` here, and
 *   2. add a matching `:root[data-season="…"] { … }` block in globals.css.
 */

export type Season = "spring" | "summer" | "autumn" | "winter";

export type SeasonColors = {
  /** Human-friendly Russian label (handy for tooltips / debugging). */
  label: string;
  /** The headline accent colour for this season (hex). */
  accent: string;
  /** Short description of the intended mood. */
  mood: string;
};

/**
 * Canonical palette description for each season. The hex values mirror the
 * seasonal accents defined in `globals.css` so the two never drift apart.
 */
export const SEASON_COLORS: Record<Season, SeasonColors> = {
  spring: { label: "Весна", accent: "#d4f1d4", mood: "свежий, лёгкий, воздушный" },
  summer: { label: "Лето", accent: "#ffd966", mood: "тёплый, солнечный, золотистый" },
  autumn: { label: "Осень", accent: "#e8714d", mood: "уютный, терракотовый" },
  winter: { label: "Зима", accent: "#e8d4f0", mood: "прохладный, сиреневый" }
};

/**
 * Maps a calendar month (0 = January … 11 = December) to a season.
 * March–May → spring, June–August → summer, September–November → autumn,
 * December–February → winter.
 */
export function getSeason(month: number): Season {
  const normalized = ((month % 12) + 12) % 12;
  if (normalized >= 2 && normalized <= 4) return "spring";
  if (normalized >= 5 && normalized <= 7) return "summer";
  if (normalized >= 8 && normalized <= 10) return "autumn";
  return "winter";
}

/** The current season, derived from the runtime date. */
export function getCurrentSeason(date: Date = new Date()): Season {
  return getSeason(date.getMonth());
}

/** The full colour description for the current (or given) season. */
export function getSeasonColors(date: Date = new Date()): SeasonColors & { season: Season } {
  const season = getCurrentSeason(date);
  return { season, ...SEASON_COLORS[season] };
}
