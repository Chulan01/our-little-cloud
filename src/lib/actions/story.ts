"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { requireCouple } from "@/lib/auth/guard";
import { hasSupabaseEnv, isLocalStoreDisabled } from "@/lib/env";
import { localCreateStoryEvent, localDeleteStoryEvent, localListStoryEvents, localUpdateStoryEvent } from "@/lib/local-store";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/utils/storage";
import {
  createStoryEventSchema,
  storyEventIdSchema,
  updateStoryEventSchema,
  type CreateStoryEventInput,
  type UpdateStoryEventInput
} from "@/lib/validations/story";
import { fail, logServerError, ok, validationError, type Result } from "@/lib/utils/errors";
import type { StoryEvent, StoryEventWithPhoto } from "@/types/domain";

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
