"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guard";
import { createCoupleSchema, joinCoupleSchema, type CreateCoupleInput, type JoinCoupleInput } from "@/lib/validations/couple";
import { fail, logServerError, ok, validationError, type Result } from "@/lib/utils/errors";
import type { Couple } from "@/types/domain";

/** Creates a private couple for the current user and returns the invite code. */
export async function createCouple(input: CreateCoupleInput): Promise<Result<Couple>> {
  const parsed = createCoupleSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const user = await requireUser();
  const supabase = createClient();

  const { data: profile } = await supabase.from("profiles").select("couple_id").eq("id", user.id).single();
  if (profile?.couple_id) {
    return fail("FORBIDDEN", "Ты уже привязан к паре.");
  }

  const { data: couple, error: coupleError } = await supabase
    .from("couples")
    .insert({
      name: parsed.data.name,
      anniversary_date: parsed.data.anniversaryDate ?? null,
      created_by: user.id
    })
    .select("*")
    .single();

  if (coupleError || !couple) {
    logServerError("createCouple.insert", coupleError);
    return fail("SERVER", "Не получилось создать пару. Попробуй еще раз.");
  }

  const { error: profileError } = await supabase.from("profiles").update({ couple_id: couple.id }).eq("id", user.id);
  if (profileError) {
    logServerError("createCouple.profile", profileError);
    return fail("SERVER", "Пара создана, но профиль не привязался. Попробуй обновить страницу.");
  }

  revalidatePath("/");
  return ok(couple);
}

/** Joins the current user to a couple by invite code through a security-definer RPC. */
export async function joinCouple(input: JoinCoupleInput): Promise<Result<Couple>> {
  const parsed = joinCoupleSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  await requireUser();
  const supabase = createClient();
  const { data: couple, error } = await supabase.rpc("join_couple_by_invite", {
    p_invite_code: parsed.data.inviteCode
  });

  if (error || !couple) {
    logServerError("joinCouple.rpc", error);
    return fail("SERVER", "Не получилось присоединиться: проверь код и свободно ли облачко.");
  }

  revalidatePath("/");
  return ok(couple);
}
