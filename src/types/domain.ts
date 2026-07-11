import type { Database } from "./database.types";

export type Couple = Database["public"]["Tables"]["couples"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Memory = Database["public"]["Tables"]["memories"]["Row"];
export type MemoryPhoto = Database["public"]["Tables"]["memory_photos"]["Row"];
export type LoveReason = Database["public"]["Tables"]["love_reasons"]["Row"];
export type TimeCapsule = Database["public"]["Views"]["time_capsules_safe"]["Row"];
export type LoveCounter = Database["public"]["Tables"]["love_counters"]["Row"] & {
  computedValue?: number;
  display_mode?: "normal" | "days_since_anniversary" | "infinity";
};
export type CounterHistory = Database["public"]["Tables"]["counter_history"]["Row"];
export type SecretMessage = Database["public"]["Views"]["secret_messages_safe"]["Row"];

/**
 * A pinned place on the couple's dating map. Not generated from
 * `database.types` because the table was added after the last typegen run —
 * keep the shape in sync with `supabase/migrations/0011_date_spots_story.sql`.
 */
export type DateSpot = {
  id: string;
  couple_id: string;
  title: string;
  body: string;
  lat: number;
  lng: number;
  spot_date: string | null;
  photo_url: string | null;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
};

export type DateSpotWithPhoto = DateSpot & {
  /** Resolved image src: signed storage URL, external URL, or null. */
  photoSrc: string | null;
};

/** One entry of the "Наша история" vertical timeline. */
export type StoryEvent = {
  id: string;
  couple_id: string;
  event_date: string;
  title: string;
  body: string;
  emoji: string | null;
  photo_url: string | null;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
};

export type StoryEventWithPhoto = StoryEvent & {
  photoSrc: string | null;
};

/** Which partner a reaction belongs to (drives left/right placement). */
export type ReactionPerson = "maxim" | "vika";

/** Available heart reaction kinds. Keep in sync with HEART_KINDS in the UI. */
export type HeartKind = "tender" | "spark" | "pulse" | "forever";

/**
 * A single heart reaction left under a timeline entry. Hand-defined (not from
 * `database.types`) because the table was added after the last typegen run —
 * keep in sync with `supabase/migrations/0012_story_reactions.sql`.
 */
export type StoryReaction = {
  id: string;
  couple_id: string;
  event_id: string;
  person: ReactionPerson;
  heart: HeartKind;
  created_at: string;
  updated_at: string;
};

/** Reactions for one event, split by partner (either may be null). */
export type EventReactions = {
  maxim: HeartKind | null;
  vika: HeartKind | null;
};

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
};
