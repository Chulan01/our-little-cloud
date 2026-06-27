"use server";

import { revalidatePath } from "next/cache";
import { requireCouple } from "@/lib/auth/guard";
import { hasSupabaseEnv, isLocalStoreDisabled } from "@/lib/env";
import { localListMessages, localMarkMessageRead, localSendMessage } from "@/lib/local-store";
import { createClient } from "@/lib/supabase/server";
import { markAsReadSchema, sendMessageSchema, type SendMessageInput } from "@/lib/validations/message";
import { fail, logServerError, ok, validationError, type Result } from "@/lib/utils/errors";
import type { SecretMessage } from "@/types/domain";

/** Sends a direct or delayed message to the partner. */
export async function sendMessage(input: SendMessageInput): Promise<Result<SecretMessage>> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    const message = await localSendMessage(parsed.data);
    revalidatePath("/secret");
    return ok(message);
  }

  const { user, coupleId } = await requireCouple();
  if (parsed.data.recipientId === user.id) return fail("VALIDATION", "Сообщение должно быть для партнера.");

  const supabase = createClient();
  const { data, error } = await supabase
    .from("secret_messages")
    .insert({
      couple_id: coupleId,
      sender_id: user.id,
      recipient_id: parsed.data.recipientId,
      body: parsed.data.body,
      reveal_at: parsed.data.revealAt ?? null
    })
    .select("*")
    .single();

  if (error || !data) {
    logServerError("sendMessage", error);
    return fail("SERVER", "Не получилось отправить сообщение.");
  }

  revalidatePath("/secret");
  return ok({
    ...data,
    body: !data.reveal_at || new Date(data.reveal_at).getTime() <= Date.now() ? data.body : null,
    is_revealed: !data.reveal_at || new Date(data.reveal_at).getTime() <= Date.now()
  });
}

/** Lists messages through the safe view, masking delayed bodies. */
export async function listMessages(): Promise<Result<SecretMessage[]>> {
  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    return ok(await localListMessages());
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("secret_messages_safe")
    .select("*")
    .eq("couple_id", coupleId)
    .order("created_at");

  if (error) {
    logServerError("listMessages", error);
    return fail("SERVER", "Не получилось загрузить сообщения.");
  }

  return ok((data ?? []) as SecretMessage[]);
}

/** Marks a revealed incoming message as read. */
export async function markAsRead(input: { id: string }): Promise<Result<SecretMessage>> {
  const parsed = markAsReadSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  if (!hasSupabaseEnv()) {
    if (isLocalStoreDisabled()) return fail("SERVER", "Хранилище не настроено на этом сервере. Подключите Supabase.");
    const message = await localMarkMessageRead(parsed.data.id);
    if (!message) return fail("NOT_FOUND", "Сообщение не найдено.");
    revalidatePath("/secret");
    return ok(message);
  }

  const { user, coupleId } = await requireCouple();
  const supabase = createClient();
  const { data: message } = await supabase.from("secret_messages").select("*").eq("id", parsed.data.id).eq("couple_id", coupleId).single();
  if (!message) return fail("NOT_FOUND", "Сообщение не найдено.");
  if (message.recipient_id !== user.id) return fail("FORBIDDEN", "Отметить прочтение может только получатель.");
  if (message.reveal_at && new Date(message.reveal_at).getTime() > Date.now()) return fail("FORBIDDEN", "Это сообщение еще закрыто.");

  const { data, error } = await supabase
    .from("secret_messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("couple_id", coupleId)
    .select("*")
    .single();

  if (error || !data) {
    logServerError("markAsRead", error);
    return fail("SERVER", "Не получилось отметить прочтение.");
  }

  revalidatePath("/secret");
  return ok({ ...data, body: data.body, is_revealed: true });
}
