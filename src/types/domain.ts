import type { Database } from "./database.types";

export type Couple = Database["public"]["Tables"]["couples"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Memory = Database["public"]["Tables"]["memories"]["Row"];
export type MemoryPhoto = Database["public"]["Tables"]["memory_photos"]["Row"];
export type LoveReason = Database["public"]["Tables"]["love_reasons"]["Row"];
export type TimeCapsule = Database["public"]["Views"]["time_capsules_safe"]["Row"];
export type LoveCounter = Database["public"]["Tables"]["love_counters"]["Row"] & {
  computedValue?: number;
};
export type CounterHistory = Database["public"]["Tables"]["counter_history"]["Row"];
export type SecretMessage = Database["public"]["Views"]["secret_messages_safe"]["Row"];

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
};
