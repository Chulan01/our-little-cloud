"use server";

import { revalidatePath } from "next/cache";
import { requireCouple } from "@/lib/auth/guard";
import { hasSupabaseEnv, isLocalStoreDisabled } from "@/lib/env";
import { localCreateMemory, localDeleteMemory, localListMemories } from "@/lib/local-store";
import { createClient } from "@/lib/supabase/server";
import { deletePhoto, getSignedUrl, uploadPhoto } from "@/lib/utils/storage";
import { addMemoryPhotosSchema, createMemorySchema, memoryIdSchema, updateMemorySchema, type CreateMemoryInput, type UpdateMemoryInput } from "@/lib/validations/memory";
import { fail, logServerError, ok, validationError, type Result } from "@/lib/utils/errors";
import type { Memory, MemoryPhoto } from "@/types/domain";

export type MemoryWithPhotos = Memory & { photos: Array<MemoryPhoto & { signedUrl: string }> };

/** Lists memories with private signed photo URLs. */
export async function listMemories(): Promise<Result<MemoryWithPhotos[]>> {
  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    return ok(await localListMemories());
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data: memories, error } = await supabase
    .from("memories")
    .select("*")
    .eq("couple_id", coupleId)
    .order("memory_date", { ascending: false });

  if (error) {
    logServerError("listMemories.memories", error);
    return fail("SERVER", "Не получилось загрузить воспоминания.");
  }

  const memoryIds = (memories ?? []).map((memory) => memory.id);
  const { data: photos, error: photosError } = memoryIds.length
    ? await supabase.from("memory_photos").select("*").in("memory_id", memoryIds).order("position")
    : { data: [], error: null };

  if (photosError) {
    logServerError("listMemories.photos", photosError);
    return fail("SERVER", "Не получилось загрузить фото.");
  }

  const result = await Promise.all(
    (memories ?? []).map(async (memory) => {
      const scopedPhotos = (photos ?? []).filter((photo) => photo.memory_id === memory.id);
      const signedPhotos = await Promise.all(
        scopedPhotos.map(async (photo) => ({ ...photo, signedUrl: await getSignedUrl(photo.storage_path) }))
      );
      return { ...memory, photos: signedPhotos };
    })
  );

  return ok(result);
}

/** Creates a memory for the current couple. */
export async function createMemory(input: CreateMemoryInput): Promise<Result<Memory>> {
  const parsed = createMemorySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    const memory = await localCreateMemory(parsed.data);
    revalidatePath("/memories");
    return ok(memory);
  }

  const { user, coupleId } = await requireCouple();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("memories")
    .insert({
      couple_id: coupleId,
      author_id: user.id,
      memory_date: parsed.data.memoryDate,
      title: parsed.data.title,
      body: parsed.data.body
    })
    .select("*")
    .single();

  if (error || !data) {
    logServerError("createMemory", error);
    return fail("SERVER", "Не получилось сохранить воспоминание.");
  }

  revalidatePath("/memories");
  return ok(data);
}

/** Updates an existing memory in the current couple. */
export async function updateMemory(input: UpdateMemoryInput): Promise<Result<Memory>> {
  const parsed = updateMemorySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("memories")
    .update({
      memory_date: parsed.data.memoryDate,
      title: parsed.data.title,
      body: parsed.data.body
    })
    .eq("id", parsed.data.id)
    .eq("couple_id", coupleId)
    .select("*")
    .single();

  if (error || !data) {
    logServerError("updateMemory", error);
    return fail("SERVER", "Не получилось обновить воспоминание.");
  }

  revalidatePath("/memories");
  return ok(data);
}

/** Deletes a memory and removes its storage files. */
export async function deleteMemory(input: { id: string }): Promise<Result<{ id: string }>> {
  const parsed = memoryIdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    await localDeleteMemory(parsed.data.id);
    revalidatePath("/memories");
    return ok({ id: parsed.data.id });
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data: photos } = await supabase.from("memory_photos").select("*").eq("memory_id", parsed.data.id).eq("couple_id", coupleId);
  await Promise.all((photos ?? []).map((photo) => deletePhoto(photo.storage_path)));

  const { error } = await supabase.from("memories").delete().eq("id", parsed.data.id).eq("couple_id", coupleId);
  if (error) {
    logServerError("deleteMemory", error);
    return fail("SERVER", "Не получилось удалить воспоминание.");
  }

  revalidatePath("/memories");
  return ok({ id: parsed.data.id });
}

/** Adds photos to a memory and stores metadata in Postgres. */
export async function addMemoryPhotos(input: { memoryId: string; files: File[] }): Promise<Result<MemoryPhoto[]>> {
  const parsed = addMemoryPhotosSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  if (!hasSupabaseEnv()) return fail("SERVER", "Фото получится сохранить после подключения облачного хранения.");

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const uploaded = await Promise.all(
    parsed.data.files.map((file) => uploadPhoto({ coupleId, entity: "memories", entityId: parsed.data.memoryId, file }))
  );

  const rows = uploaded.map((photo, index) => ({
    memory_id: parsed.data.memoryId,
    couple_id: coupleId,
    storage_path: photo.path,
    width: photo.width,
    height: photo.height,
    position: index
  }));

  const { data, error } = await supabase.from("memory_photos").insert(rows).select("*");
  if (error || !data) {
    logServerError("addMemoryPhotos", error);
    return fail("SERVER", "Фото загрузились, но не сохранились в записи.");
  }

  revalidatePath("/memories");
  return ok(data);
}

/** Deletes one memory photo from metadata and storage. */
export async function deleteMemoryPhoto(input: { id: string }): Promise<Result<{ id: string }>> {
  const parsed = memoryIdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data: photo, error: findError } = await supabase.from("memory_photos").select("*").eq("id", parsed.data.id).eq("couple_id", coupleId).single();
  if (findError || !photo) return fail("NOT_FOUND", "Фото не найдено.");

  await deletePhoto(photo.storage_path);
  const { error } = await supabase.from("memory_photos").delete().eq("id", parsed.data.id).eq("couple_id", coupleId);
  if (error) {
    logServerError("deleteMemoryPhoto", error);
    return fail("SERVER", "Не получилось удалить фото.");
  }

  revalidatePath("/memories");
  return ok({ id: parsed.data.id });
}
