"use server";

import { revalidatePath } from "next/cache";
import { requireCouple } from "@/lib/auth/guard";
import { hasSupabaseEnv, isLocalStoreDisabled } from "@/lib/env";
import { localCreateMemory, localDeleteMemory, localListMemories } from "@/lib/local-store";
import { createClient } from "@/lib/supabase/server";
import { deletePhoto, getSignedUrl, uploadPhoto } from "@/lib/utils/storage";
import { createMemorySchema, memoryIdSchema, updateMemorySchema, type CreateMemoryInput, type UpdateMemoryInput } from "@/lib/validations/memory";
import { idSchema } from "@/lib/validations/shared";
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

/**
 * Adds photos to an existing memory.
 *
 * Why this accepts a `FormData` and not `{ memoryId, files: File[] }`:
 * Next.js Server Actions do support `File` arguments, but a `File[]` field
 * crosses the boundary in a way that can lose the binary content of large or
 * non-trivial uploads — the multipart body is reconstructed server-side and
 * the Zod schema's `instanceof File` guard often fails on the server runtime
 * (`"value is not a File"`), which silently rejects every photo. Passing the
 * form's `FormData` directly routes through Next.js's reliable multipart path
 * and `instanceof File` works again, so we validate with simple checks here.
 */
export async function addMemoryPhotos(formData: FormData): Promise<Result<MemoryPhoto[]>> {
  if (!hasSupabaseEnv()) return fail("SERVER", "Фото получится сохранить после подключения облачного хранения.");

  const { coupleId } = await requireCouple();
  const supabase = createClient();

  const memoryIdRaw = formData.get("memoryId");
  if (typeof memoryIdRaw !== "string") {
    return fail("VALIDATION", "Не указан идентификатор воспоминания.");
  }
  const memoryIdParsed = idSchema.safeParse(memoryIdRaw);
  if (!memoryIdParsed.success) return validationError(memoryIdParsed.error);

  const files = formData
    .getAll("files")
    .filter((item): item is File => item instanceof File && item.size > 0)
    .slice(0, 8);

  if (files.length === 0) return ok([]);

  for (const file of files) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return fail("VALIDATION", `${file.name || "фото"}: поддерживаются только JPG, PNG и WebP.`);
    }
    if (file.size > 5 * 1024 * 1024) {
      return fail("VALIDATION", `${file.name || "фото"}: фото должно быть не больше 5MB.`);
    }
  }

  const uploaded = await Promise.all(
    files.map((file) => uploadPhoto({ coupleId, entity: "memories", entityId: memoryIdParsed.data, file }))
  );

  const rows = uploaded.map((photo, index) => ({
    memory_id: memoryIdParsed.data,
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
