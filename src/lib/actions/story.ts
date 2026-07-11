"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { requireCouple } from "@/lib/auth/guard";
import { hasSupabaseEnv, isLocalStoreDisabled } from "@/lib/env";
import {
  localClearStoryReaction,
  localCreateStoryEvent,
  localDeleteStoryEvent,
  localListStoryEvents,
  localListStoryReactions,
  localSetStoryReaction,
  localUpdateStoryEvent
} from "@/lib/local-store";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/utils/storage";
import {
  clearStoryReactionSchema,
  createStoryEventSchema,
  setStoryReactionSchema,
  storyEventIdSchema,
  updateStoryEventSchema,
  type ClearStoryReactionInput,
  type CreateStoryEventInput,
  type SetStoryReactionInput,
  type UpdateStoryEventInput
} from "@/lib/validations/story";
import { fail, logServerError, ok, validationError, type Result } from "@/lib/utils/errors";
import type { StoryEvent, StoryEventWithPhoto, StoryReaction } from "@/types/domain";

async function resolvePhotoSrc(event: StoryEvent): Promise<string | null> {
  if (event.storage_path) {
    try {
      return await getSignedUrl(event.storage_path);
    } catch (error) {
      logServerError("story.resolvePhotoSrc", error);
      return event.photo_url;
    }
  }
  return event.photo_url;
}

/** Lists timeline events sorted chronologically. */
export async function listStoryEvents(): Promise<Result<StoryEventWithPhoto[]>> {
  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    const events = await localListStoryEvents();
    return ok(events.map((event) => ({ ...event, photoSrc: event.photo_url })));
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("story_events")
    .select("*")
    .eq("couple_id", coupleId)
    .order("event_date", { ascending: true });

  if (error) {
    logServerError("listStoryEvents", error);
    return fail("SERVER", "Не получилось загрузить историю.");
  }

  const events = (data ?? []) as StoryEvent[];
  const withPhotos = await Promise.all(events.map(async (event) => ({ ...event, photoSrc: await resolvePhotoSrc(event) })));
  return ok(withPhotos);
}

/** Adds a new timeline event. Admin only. */
export async function createStoryEvent(input: CreateStoryEventInput): Promise<Result<StoryEvent>> {
  if (!(await isAdmin())) return fail("FORBIDDEN", "Дополнять историю может только хранитель облачка.");

  const parsed = createStoryEventSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    const event = await localCreateStoryEvent(parsed.data);
    revalidatePath("/story");
    return ok(event);
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("story_events")
    .insert({
      couple_id: coupleId,
      event_date: parsed.data.eventDate,
      title: parsed.data.title,
      body: parsed.data.body,
      emoji: parsed.data.emoji ?? null,
      photo_url: parsed.data.photoUrl ?? null
    })
    .select("*")
    .single();

  if (error || !data) {
    logServerError("createStoryEvent", error);
    return fail("SERVER", "Не получилось сохранить событие.");
  }

  revalidatePath("/story");
  return ok(data as StoryEvent);
}

/** Updates an existing timeline event. Admin only. */
export async function updateStoryEvent(input: UpdateStoryEventInput): Promise<Result<StoryEvent>> {
  if (!(await isAdmin())) return fail("FORBIDDEN", "Редактировать историю может только хранитель облачка.");

  const parsed = updateStoryEventSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    const event = await localUpdateStoryEvent(parsed.data);
    if (!event) return fail("NOT_FOUND", "Событие не найдено.");
    revalidatePath("/story");
    return ok(event);
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("story_events")
    .update({
      event_date: parsed.data.eventDate,
      title: parsed.data.title,
      body: parsed.data.body,
      emoji: parsed.data.emoji ?? null,
      photo_url: parsed.data.photoUrl ?? null
    })
    .eq("id", parsed.data.id)
    .eq("couple_id", coupleId)
    .select("*")
    .single();

  if (error || !data) {
    logServerError("updateStoryEvent", error);
    return fail("SERVER", "Не получилось обновить событие.");
  }

  revalidatePath("/story");
  return ok(data as StoryEvent);
}

/** Removes a timeline event. Admin only. */
export async function deleteStoryEvent(input: { id: string }): Promise<Result<{ id: string }>> {
  if (!(await isAdmin())) return fail("FORBIDDEN", "Удалять события может только хранитель облачка.");

  const parsed = storyEventIdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    await localDeleteStoryEvent(parsed.data.id);
    revalidatePath("/story");
    return ok({ id: parsed.data.id });
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { error } = await supabase.from("story_events").delete().eq("id", parsed.data.id).eq("couple_id", coupleId);

  if (error) {
    logServerError("deleteStoryEvent", error);
    return fail("SERVER", "Не получилось удалить событие.");
  }

  revalidatePath("/story");
  return ok({ id: parsed.data.id });
}

/** Lists every heart reaction for the couple's timeline. Couple members only. */
export async function listStoryReactions(): Promise<Result<StoryReaction[]>> {
  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return ok([]);
    return ok(await localListStoryReactions());
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data, error } = await supabase.from("story_reactions").select("*").eq("couple_id", coupleId);

  if (error) {
    logServerError("listStoryReactions", error);
    return fail("SERVER", "Не получилось загрузить реакции.");
  }

  return ok((data ?? []) as StoryReaction[]);
}

/** Sets (or replaces) one partner's heart reaction on an event. Couple members. */
export async function setStoryReaction(input: SetStoryReactionInput): Promise<Result<StoryReaction>> {
  const parsed = setStoryReactionSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    const reaction = await localSetStoryReaction(parsed.data);
    revalidatePath("/story");
    return ok(reaction);
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("story_reactions")
    .upsert(
      { couple_id: coupleId, event_id: parsed.data.eventId, person: parsed.data.person, heart: parsed.data.heart },
      { onConflict: "event_id,person" }
    )
    .select("*")
    .single();

  if (error || !data) {
    logServerError("setStoryReaction", error);
    return fail("SERVER", "Не получилось сохранить реакцию.");
  }

  revalidatePath("/story");
  return ok(data as StoryReaction);
}

/** Removes one partner's reaction from an event (toggle off). Couple members. */
export async function clearStoryReaction(input: ClearStoryReactionInput): Promise<Result<{ eventId: string }>> {
  const parsed = clearStoryReactionSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    await localClearStoryReaction(parsed.data);
    revalidatePath("/story");
    return ok({ eventId: parsed.data.eventId });
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { error } = await supabase
    .from("story_reactions")
    .delete()
    .eq("couple_id", coupleId)
    .eq("event_id", parsed.data.eventId)
    .eq("person", parsed.data.person);

  if (error) {
    logServerError("clearStoryReaction", error);
    return fail("SERVER", "Не получилось убрать реакцию.");
  }

  revalidatePath("/story");
  return ok({ eventId: parsed.data.eventId });
}
