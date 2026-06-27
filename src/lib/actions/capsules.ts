"use server";

import { revalidatePath } from "next/cache";
import { requireCouple } from "@/lib/auth/guard";
import { hasSupabaseEnv, isLocalStoreDisabled } from "@/lib/env";
import { localCreateCapsule, localListCapsules, localOpenCapsule } from "@/lib/local-store";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl, uploadPhoto } from "@/lib/utils/storage";
import { capsuleIdSchema, createCapsuleSchema, type CreateCapsuleInput } from "@/lib/validations/capsule";
import { fail, logServerError, ok, validationError, type Result } from "@/lib/utils/errors";
import type { TimeCapsule } from "@/types/domain";

export type CapsuleWithPhotos = TimeCapsule & { photos: string[] };

/** Creates a sealed time capsule. Body will be masked by the safe view until open_at. */
export async function createCapsule(input: CreateCapsuleInput): Promise<Result<TimeCapsule>> {
  const parsed = createCapsuleSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    const capsule = await localCreateCapsule(parsed.data);
    revalidatePath("/capsules");
    return ok(capsule);
  }

  const { user, coupleId } = await requireCouple();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("time_capsules")
    .insert({
      couple_id: coupleId,
      author_id: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      open_at: parsed.data.openAt
    })
    .select("*")
    .single();

  if (error || !data) {
    logServerError("createCapsule", error);
    return fail("SERVER", "Не получилось создать капсулу.");
  }

  if (parsed.data.files?.length) {
    const uploads = await Promise.all(parsed.data.files.map((file) => uploadPhoto({ coupleId, entity: "capsules", entityId: data.id, file })));
    await supabase.from("time_capsule_photos").insert(
      uploads.map((photo, index) => ({
        capsule_id: data.id,
        couple_id: coupleId,
        storage_path: photo.path,
        width: photo.width,
        height: photo.height,
        position: index
      }))
    );
  }

  revalidatePath("/capsules");
  return ok({ ...data, body: new Date(data.open_at).getTime() <= Date.now() ? data.body : null, can_open: new Date(data.open_at).getTime() <= Date.now() });
}

/** Lists capsules through the safe view, so unopened body is always null. */
export async function listCapsules(): Promise<Result<CapsuleWithPhotos[]>> {
  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    return ok(await localListCapsules());
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data, error } = await supabase.from("time_capsules_safe").select("*").eq("couple_id", coupleId).order("open_at");
  if (error) {
    logServerError("listCapsules", error);
    return fail("SERVER", "Не получилось загрузить капсулы.");
  }

  const capsules = (data ?? []) as TimeCapsule[];
  const openedIds = capsules.filter((capsule) => capsule.can_open).map((capsule) => capsule.id);
  const { data: photos } = openedIds.length
    ? await supabase.from("time_capsule_photos").select("*").in("capsule_id", openedIds).order("position")
    : { data: [] };

  const result = await Promise.all(
    capsules.map(async (capsule) => {
      const photoRows = (photos ?? []) as Array<{ capsule_id: string; storage_path: string }>;
      const paths = photoRows.filter((photo) => photo.capsule_id === capsule.id).map((photo) => photo.storage_path);
      const signed = await Promise.all(paths.map((path) => getSignedUrl(path)));
      return { ...capsule, photos: signed };
    })
  );

  return ok(result);
}

/** Reads one capsule through the safe view. */
export async function getCapsule(input: { id: string }): Promise<Result<CapsuleWithPhotos>> {
  const parsed = capsuleIdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const capsules = await listCapsules();
  if (!capsules.ok) return capsules;
  const capsule = capsules.data.find((item) => item.id === parsed.data.id);
  return capsule ? ok(capsule) : fail("NOT_FOUND", "Капсула не найдена.");
}

/** Marks a capsule as opened only when the database timestamp is due. */
export async function openCapsule(input: { id: string }): Promise<Result<TimeCapsule>> {
  const parsed = capsuleIdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    const capsule = await localOpenCapsule(parsed.data.id);
    if (!capsule) return fail("FORBIDDEN", "Еще рано открывать эту капсулу.");
    revalidatePath("/capsules");
    return ok(capsule);
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data: capsule } = await supabase.from("time_capsules").select("*").eq("id", parsed.data.id).eq("couple_id", coupleId).single();
  if (!capsule) return fail("NOT_FOUND", "Капсула не найдена.");
  if (new Date(capsule.open_at).getTime() > Date.now()) return fail("FORBIDDEN", "Еще рано открывать эту капсулу.");

  const { data, error } = await supabase
    .from("time_capsules")
    .update({ is_opened: true, opened_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("couple_id", coupleId)
    .select("*")
    .single();

  if (error || !data) {
    logServerError("openCapsule", error);
    return fail("SERVER", "Не получилось открыть капсулу.");
  }

  revalidatePath("/capsules");
  return ok({ ...data, body: data.body, can_open: true });
}
