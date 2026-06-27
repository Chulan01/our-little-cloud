"use server";

import { revalidatePath } from "next/cache";
import { requireCouple } from "@/lib/auth/guard";
import { hasSupabaseEnv, isLocalStoreDisabled } from "@/lib/env";
import { localCreateCounter, localDeleteCounter, localIncrementCounter, localListCounters } from "@/lib/local-store";
import { createClient } from "@/lib/supabase/server";
import { counterIdSchema, createCounterSchema, incrementCounterSchema, setCounterSchema, type CreateCounterInput, type IncrementCounterInput, type SetCounterInput } from "@/lib/validations/counter";
import { daysBetween } from "@/lib/utils";
import { fail, logServerError, ok, validationError, type Result } from "@/lib/utils/errors";
import type { LoveCounter } from "@/types/domain";

/** Lists counters and computes auto counters from the couple anniversary date. */
export async function listCounters(): Promise<Result<LoveCounter[]>> {
  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    return ok(await localListCounters());
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const [{ data: counters, error }, { data: couple }] = await Promise.all([
    supabase.from("love_counters").select("*").eq("couple_id", coupleId).order("created_at"),
    supabase.from("couples").select("anniversary_date").eq("id", coupleId).single()
  ]);

  if (error) {
    logServerError("listCounters", error);
    return fail("SERVER", "Не получилось загрузить счетчики.");
  }

  return ok(
    (counters ?? []).map((counter) => ({
      ...counter,
      computedValue: counter.is_auto && couple?.anniversary_date ? daysBetween(couple.anniversary_date) : counter.value
    }))
  );
}

/** Creates a counter in the current couple. */
export async function createCounter(input: CreateCounterInput): Promise<Result<LoveCounter>> {
  const parsed = createCounterSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    const counter = await localCreateCounter(parsed.data);
    revalidatePath("/counters");
    return ok(counter);
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("love_counters")
    .insert({
      couple_id: coupleId,
      label: parsed.data.label,
      emoji: parsed.data.emoji ?? null,
      value: parsed.data.value,
      is_auto: parsed.data.isAuto
    })
    .select("*")
    .single();

  if (error || !data) {
    logServerError("createCounter", error);
    return fail("SERVER", "Не получилось создать счетчик.");
  }

  revalidatePath("/counters");
  return ok(data);
}

/** Increments a manual counter and appends history. */
export async function incrementCounter(input: IncrementCounterInput): Promise<Result<LoveCounter>> {
  const parsed = incrementCounterSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    const counter = await localIncrementCounter(parsed.data.id, parsed.data.delta);
    if (!counter) return fail("NOT_FOUND", "Счетчик не найден.");
    revalidatePath("/counters");
    return ok(counter);
  }

  const { user, coupleId } = await requireCouple();
  const supabase = createClient();
  const { data: counter } = await supabase.from("love_counters").select("*").eq("id", parsed.data.id).eq("couple_id", coupleId).single();
  if (!counter) return fail("NOT_FOUND", "Счетчик не найден.");
  if (counter.is_auto) return fail("FORBIDDEN", "Автоматический счетчик нельзя менять вручную.");

  const nextValue = Math.max(0, counter.value + parsed.data.delta);
  const { data, error } = await supabase.from("love_counters").update({ value: nextValue }).eq("id", counter.id).select("*").single();
  if (error || !data) {
    logServerError("incrementCounter", error);
    return fail("SERVER", "Не получилось изменить счетчик.");
  }

  await supabase.from("counter_history").insert({
    counter_id: counter.id,
    couple_id: coupleId,
    changed_by: user.id,
    delta: parsed.data.delta,
    new_value: nextValue
  });

  revalidatePath("/counters");
  return ok(data);
}

/** Sets a manual counter to an exact value and appends history. */
export async function setCounter(input: SetCounterInput): Promise<Result<LoveCounter>> {
  const parsed = setCounterSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const { user, coupleId } = await requireCouple();
  const supabase = createClient();
  const { data: counter } = await supabase.from("love_counters").select("*").eq("id", parsed.data.id).eq("couple_id", coupleId).single();
  if (!counter) return fail("NOT_FOUND", "Счетчик не найден.");

  const delta = parsed.data.value - counter.value;
  const { data, error } = await supabase.from("love_counters").update({ value: parsed.data.value }).eq("id", counter.id).select("*").single();
  if (error || !data) {
    logServerError("setCounter", error);
    return fail("SERVER", "Не получилось установить значение.");
  }

  await supabase.from("counter_history").insert({ counter_id: counter.id, couple_id: coupleId, changed_by: user.id, delta, new_value: parsed.data.value });
  revalidatePath("/counters");
  return ok(data);
}

/** Deletes a counter and its history by cascade. */
export async function deleteCounter(input: { id: string }): Promise<Result<{ id: string }>> {
  const parsed = counterIdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    await localDeleteCounter(parsed.data.id);
    revalidatePath("/counters");
    return ok({ id: parsed.data.id });
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { error } = await supabase.from("love_counters").delete().eq("id", parsed.data.id).eq("couple_id", coupleId);
  if (error) {
    logServerError("deleteCounter", error);
    return fail("SERVER", "Не получилось удалить счетчик.");
  }

  revalidatePath("/counters");
  return ok({ id: parsed.data.id });
}
