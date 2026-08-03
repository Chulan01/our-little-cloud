"use server";

import { createClient } from "@/lib/supabase/server";
import { requireCouple } from "@/lib/auth/guard";
import { hasSupabaseEnv, isLocalStoreDisabled } from "@/lib/env";
import { isLocalAuthEnabled } from "@/lib/local-auth";
import {
  localDismissHugSignal,
  localGetHugState,
  localSendHugBack,
  localSendMissSignal,
  type LocalHugState
} from "@/lib/local-store";
import { fail, logServerError, ok, type Result } from "@/lib/utils/errors";

/** Single hug signal row, mirrored between local JSON and the Supabase table. */
export type HugSignalRecord = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: "missing" | "hugged";
  created_at: string;
  hugged_at: string | null;
  sender_seen_at: string | null;
};

/** State for the current user + partner, with denormalized display names and gender. */
export type HugState = {
  currentUserId: string | null;
  currentName: string | null;
  currentGender: "male" | "female" | "unspecified" | null;
  partnerName: string | null;
  partnerGender: "male" | "female" | "unspecified" | null;
  incoming: (HugSignalRecord & { senderName: string }) | null;
  outgoing: (HugSignalRecord & { recipientName: string }) | null;
};

export type { LocalHugState } from "@/lib/local-store";

const EMPTY_STATE: HugState = {
  currentUserId: null,
  currentName: null,
  currentGender: null,
  partnerName: null,
  partnerGender: null,
  incoming: null,
  outgoing: null
};

/**
 * Returns the back-end we should use. Local JSON store wins on non-Vercel
 * hosts when explicitly enabled via env; otherwise we hit Supabase.
 */
function useLocalStore(): boolean {
  if (isLocalStoreDisabled()) return false;
  return isLocalAuthEnabled();
}

function pickOutgoing(signals: HugSignalRecord[], senderId: string, partnerId: string): HugSignalRecord | null {
  return (
    signals.find(
      (signal) =>
        signal.sender_id === senderId &&
        signal.recipient_id === partnerId &&
        (signal.status === "missing" || (signal.status === "hugged" && !signal.sender_seen_at))
    ) ?? null
  );
}

function pickIncoming(signals: HugSignalRecord[], recipientId: string): HugSignalRecord | null {
  return signals.find((signal) => signal.recipient_id === recipientId && signal.status === "missing") ?? null;
}

type ProfileRow = { id: string; display_name: string; gender: string | null };
function pickPartner(profiles: ProfileRow[], currentUserId: string): ProfileRow | null {
  return profiles.find((profile) => profile.id !== currentUserId) ?? null;
}

async function fetchCoupleSignals(supabase: ReturnType<typeof createClient>, coupleId: string): Promise<HugSignalRecord[]> {
  const { data, error } = await supabase
    .from("hug_signals")
    .select("id, couple_id, sender_id, recipient_id, status, created_at, hugged_at, sender_seen_at")
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as HugSignalRecord[];
}

/**
 * Builds the current user's hug state from the Supabase back-end. Centralised
 * so the four server actions below all return the same shape after a mutation.
 */
async function buildSupabaseHugState(
  supabase: ReturnType<typeof createClient>,
  coupleId: string,
  currentUserId: string
): Promise<HugState> {
  const { data, error } = await supabase.from("profiles").select("id, display_name, gender").eq("couple_id", coupleId);
  if (error) throw error;

  const profiles = (data ?? []) as ProfileRow[];
  const current = profiles.find((profile) => profile.id === currentUserId) ?? null;
  const partner = pickPartner(profiles, currentUserId);

  if (!current || !partner) {
    return {
      ...EMPTY_STATE,
      currentUserId,
      currentName: current?.display_name ?? null,
      partnerName: partner?.display_name ?? null
    };
  }

  const signals = await fetchCoupleSignals(supabase, coupleId);
  const incoming = pickIncoming(signals, currentUserId);
  const outgoing = pickOutgoing(signals, currentUserId, partner.id);

  return {
    currentUserId,
    currentName: current.display_name,
    currentGender: normalizeGender(current.gender ?? null),
    partnerName: partner.display_name,
    partnerGender: normalizeGender(partner.gender ?? null),
    incoming: incoming ? { ...incoming, senderName: partner.display_name } : null,
    outgoing: outgoing ? { ...outgoing, recipientName: partner.display_name } : null
  };
}

function normalizeGender(value: string | null): "male" | "female" | "unspecified" {
  if (value === "male" || value === "female" || value === "unspecified") return value;
  return "unspecified";
}

/**
 * Loads the current hug state for the signed-in user.
 *
 * Deliberately does NOT use `requireCouple()`: HugWidget polls this action
 * from the root layout on *every* page — including /login and /onboarding —
 * so a guest or an unbound user must get an empty state back, never a
 * `redirect()`. A redirect here would bounce the router into an endless
 * reload loop (the widget re-mounts on every navigation and the 8s poll
 * keeps re-firing). Mirrors the guest-safe pattern of `getUnreadMessageCount`.
 */
export async function getHugState(): Promise<Result<HugState>> {
  if (useLocalStore()) {
    return ok(await localGetHugState());
  }
  if (!hasSupabaseEnv()) {
    return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return ok(EMPTY_STATE);

  const { data: profile } = await supabase
    .from("profiles")
    .select("couple_id")
    .eq("id", userData.user.id)
    .single();
  if (!profile?.couple_id) {
    return ok({ ...EMPTY_STATE, currentUserId: userData.user.id });
  }

  return ok(await buildSupabaseHugState(supabase, profile.couple_id, userData.user.id));
}

/** Creates a fresh "Я скучаю" signal from the current user to the partner. */
export async function sendMissSignal(): Promise<Result<HugState>> {
  if (useLocalStore()) {
    const signal = await localSendMissSignal();
    if (!signal) return fail("UNAUTHORIZED", "Сначала войди в аккаунт.");
    return ok(await localGetHugState());
  }
  if (!hasSupabaseEnv()) {
    return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
  }

  const supabase = createClient();
  const { user, coupleId } = await requireCouple();

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id")
    .eq("couple_id", coupleId);
  if (profilesError) {
    logServerError("sendMissSignal.profiles", profilesError);
    return fail("SERVER", "Не получилось найти партнера.");
  }
  const partner = pickPartner((profiles ?? []) as ProfileRow[], user.id);
  if (!partner) return fail("FORBIDDEN", "Сначала пригласи партнера в облачко.");

  const { data: existing } = await supabase
    .from("hug_signals")
    .select("id")
    .eq("sender_id", user.id)
    .eq("recipient_id", partner.id)
    .eq("status", "missing")
    .maybeSingle();
  if (!existing) {
    const { error: insertError } = await supabase.from("hug_signals").insert({
      couple_id: coupleId,
      sender_id: user.id,
      recipient_id: partner.id,
      status: "missing"
    });
    if (insertError) {
      logServerError("sendMissSignal.insert", insertError);
      return fail("SERVER", "Не получилось отправить сигнал.");
    }
  }

  return ok(await buildSupabaseHugState(supabase, coupleId, user.id));
}

/** Flips a pending incoming signal to `hugged` and stamps `hugged_at`. */
export async function sendHugBack(input: { id: string }): Promise<Result<HugState>> {
  if (useLocalStore()) {
    const signal = await localSendHugBack(input.id);
    if (!signal) return fail("NOT_FOUND", "Это объятие уже не ждет ответа.");
    return ok(await localGetHugState());
  }
  if (!hasSupabaseEnv()) {
    return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
  }

  const supabase = createClient();
  const { user, coupleId } = await requireCouple();

  const { data: signal, error: fetchError } = await supabase
    .from("hug_signals")
    .select("status, recipient_id")
    .eq("id", input.id)
    .eq("couple_id", coupleId)
    .eq("recipient_id", user.id)
    .maybeSingle();
  if (fetchError) {
    logServerError("sendHugBack.fetch", fetchError);
    return fail("SERVER", "Не получилось обработать объятие.");
  }
  if (!signal || signal.status !== "missing") {
    return fail("NOT_FOUND", "Это объятие уже не ждет ответа.");
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("hug_signals")
    .update({ status: "hugged", hugged_at: now })
    .eq("id", input.id);
  if (error) {
    logServerError("sendHugBack.update", error);
    return fail("SERVER", "Не получилось отправить объятие.");
  }

  return ok(await buildSupabaseHugState(supabase, coupleId, user.id));
}

/** Marks an outgoing signal as seen (called after the sender reviewed the partner's reaction). */
export async function dismissHugSignal(input: { id: string }): Promise<Result<HugState>> {
  if (useLocalStore()) {
    const signal = await localDismissHugSignal(input.id);
    if (!signal) return fail("NOT_FOUND", "Объятие не найдено.");
    return ok(await localGetHugState());
  }
  if (!hasSupabaseEnv()) {
    return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
  }

  const supabase = createClient();
  const { user, coupleId } = await requireCouple();

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("hug_signals")
    .update({ sender_seen_at: now })
    .eq("id", input.id)
    .eq("couple_id", coupleId)
    .eq("sender_id", user.id);
  if (error) {
    logServerError("dismissHugSignal.update", error);
    return fail("SERVER", "Не получилось скрыть уведомление.");
  }

  return ok(await buildSupabaseHugState(supabase, coupleId, user.id));
}
