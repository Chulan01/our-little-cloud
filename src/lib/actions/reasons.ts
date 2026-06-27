"use server";

import { revalidatePath } from "next/cache";
import { requireCouple } from "@/lib/auth/guard";
import { hasSupabaseEnv, isLocalStoreDisabled } from "@/lib/env";
import { localAddReason, localDeleteReason, localListReasons } from "@/lib/local-store";
import { createClient } from "@/lib/supabase/server";
import { addReasonSchema, deleteReasonSchema, reorderReasonsSchema, updateReasonSchema, type AddReasonInput, type ReorderReasonsInput, type UpdateReasonInput } from "@/lib/validations/reason";
import { fail, logServerError, ok, validationError, type Result } from "@/lib/utils/errors";
import type { LoveReason } from "@/types/domain";

/** Lists reasons ordered by their couple-local number. */
export async function listReasons(): Promise<Result<LoveReason[]>> {
  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    return ok(await localListReasons());
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data, error } = await supabase.from("love_reasons").select("*").eq("couple_id", coupleId).order("number");
  if (error) {
    logServerError("listReasons", error);
    return fail("SERVER", "Не получилось загрузить причины.");
  }
  return ok(data ?? []);
}

/** Adds a reason with the next available number inside the couple. */
export async function addReason(input: AddReasonInput): Promise<Result<LoveReason>> {
  const parsed = addReasonSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    const reason = await localAddReason(parsed.data.text);
    revalidatePath("/reasons");
    return ok(reason);
  }

  const { user, coupleId } = await requireCouple();
  const supabase = createClient();
  const { data: latest } = await supabase
    .from("love_reasons")
    .select("number")
    .eq("couple_id", coupleId)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumber = (latest?.number ?? 0) + 1;
  if (nextNumber > 365) return fail("FORBIDDEN", "365 причин уже заполнены.");

  const { data, error } = await supabase
    .from("love_reasons")
    .insert({ couple_id: coupleId, author_id: user.id, number: nextNumber, text: parsed.data.text })
    .select("*")
    .single();

  if (error || !data) {
    logServerError("addReason", error);
    return fail("SERVER", "Не получилось добавить причину.");
  }

  revalidatePath("/reasons");
  return ok(data);
}

/** Updates a reason text. */
export async function updateReason(input: UpdateReasonInput): Promise<Result<LoveReason>> {
  const parsed = updateReasonSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("love_reasons")
    .update({ text: parsed.data.text })
    .eq("id", parsed.data.id)
    .eq("couple_id", coupleId)
    .select("*")
    .single();

  if (error || !data) {
    logServerError("updateReason", error);
    return fail("SERVER", "Не получилось обновить причину.");
  }

  revalidatePath("/reasons");
  return ok(data);
}

/** Deletes a reason. Numbers are left stable until reorderReasons is called. */
export async function deleteReason(input: { id: string }): Promise<Result<{ id: string }>> {
  const parsed = deleteReasonSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    await localDeleteReason(parsed.data.id);
    revalidatePath("/reasons");
    return ok({ id: parsed.data.id });
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { error } = await supabase.from("love_reasons").delete().eq("id", parsed.data.id).eq("couple_id", coupleId);
  if (error) {
    logServerError("deleteReason", error);
    return fail("SERVER", "Не получилось удалить причину.");
  }

  revalidatePath("/reasons");
  return ok({ id: parsed.data.id });
}

/** Reassigns reason numbers according to the provided id order. */
export async function reorderReasons(input: ReorderReasonsInput): Promise<Result<LoveReason[]>> {
  const parsed = reorderReasonsSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const { coupleId } = await requireCouple();
  const supabase = createClient();

  const updates = await Promise.all(
    parsed.data.orderedIds.map((id, index) =>
      supabase.from("love_reasons").update({ number: index + 1 }).eq("id", id).eq("couple_id", coupleId).select("*").single()
    )
  );

  const error = updates.find((update) => update.error)?.error;
  if (error) {
    logServerError("reorderReasons", error);
    return fail("SERVER", "Не получилось пересортировать причины.");
  }

  revalidatePath("/reasons");
  return ok(updates.flatMap((update) => (update.data ? [update.data] : [])));
}
