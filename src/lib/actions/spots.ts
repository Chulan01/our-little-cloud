"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { requireCouple } from "@/lib/auth/guard";
import { hasSupabaseEnv, isLocalStoreDisabled } from "@/lib/env";
import { localCreateSpot, localDeleteSpot, localListSpots, localUpdateSpot } from "@/lib/local-store";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/utils/storage";
import { createSpotSchema, spotIdSchema, updateSpotSchema, type CreateSpotInput, type UpdateSpotInput } from "@/lib/validations/spot";
import { fail, logServerError, ok, validationError, type Result } from "@/lib/utils/errors";
import type { DateSpot, DateSpotWithPhoto } from "@/types/domain";

async function resolvePhotoSrc(spot: DateSpot): Promise<string | null> {
  if (spot.storage_path) {
    try {
      return await getSignedUrl(spot.storage_path);
    } catch (error) {
      logServerError("spots.resolvePhotoSrc", error);
      return spot.photo_url;
    }
  }
  return spot.photo_url;
}

/** Lists every pinned dating spot for the couple. */
export async function listSpots(): Promise<Result<DateSpotWithPhoto[]>> {
  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    const spots = await localListSpots();
    return ok(spots.map((spot) => ({ ...spot, photoSrc: spot.photo_url })));
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("date_spots")
    .select("*")
    .eq("couple_id", coupleId)
    .order("spot_date", { ascending: true, nullsFirst: false });

  if (error) {
    logServerError("listSpots", error);
    return fail("SERVER", "Не получилось загрузить места.");
  }

  const spots = (data ?? []) as DateSpot[];
  const withPhotos = await Promise.all(spots.map(async (spot) => ({ ...spot, photoSrc: await resolvePhotoSrc(spot) })));
  return ok(withPhotos);
}

/** Adds a new spot to the map. Admin only. */
export async function createSpot(input: CreateSpotInput): Promise<Result<DateSpot>> {
  if (!(await isAdmin())) return fail("FORBIDDEN", "Добавлять места может только хранитель облачка.");

  const parsed = createSpotSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    const spot = await localCreateSpot(parsed.data);
    revalidatePath("/map");
    return ok(spot);
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("date_spots")
    .insert({
      couple_id: coupleId,
      title: parsed.data.title,
      body: parsed.data.body,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      spot_date: parsed.data.spotDate ?? null,
      photo_url: parsed.data.photoUrl ?? null
    })
    .select("*")
    .single();

  if (error || !data) {
    logServerError("createSpot", error);
    return fail("SERVER", "Не получилось сохранить место.");
  }

  revalidatePath("/map");
  return ok(data as DateSpot);
}

/** Updates an existing spot. Admin only. */
export async function updateSpot(input: UpdateSpotInput): Promise<Result<DateSpot>> {
  if (!(await isAdmin())) return fail("FORBIDDEN", "Редактировать места может только хранитель облачка.");

  const parsed = updateSpotSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    const spot = await localUpdateSpot(parsed.data);
    if (!spot) return fail("NOT_FOUND", "Место не найдено.");
    revalidatePath("/map");
    return ok(spot);
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("date_spots")
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      spot_date: parsed.data.spotDate ?? null,
      photo_url: parsed.data.photoUrl ?? null
    })
    .eq("id", parsed.data.id)
    .eq("couple_id", coupleId)
    .select("*")
    .single();

  if (error || !data) {
    logServerError("updateSpot", error);
    return fail("SERVER", "Не получилось обновить место.");
  }

  revalidatePath("/map");
  return ok(data as DateSpot);
}

/** Removes a spot from the map. Admin only. */
export async function deleteSpot(input: { id: string }): Promise<Result<{ id: string }>> {
  if (!(await isAdmin())) return fail("FORBIDDEN", "Удалять места может только хранитель облачка.");

  const parsed = spotIdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    await localDeleteSpot(parsed.data.id);
    revalidatePath("/map");
    return ok({ id: parsed.data.id });
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { error } = await supabase.from("date_spots").delete().eq("id", parsed.data.id).eq("couple_id", coupleId);

  if (error) {
    logServerError("deleteSpot", error);
    return fail("SERVER", "Не получилось удалить место.");
  }

  revalidatePath("/map");
  return ok({ id: parsed.data.id });
}
