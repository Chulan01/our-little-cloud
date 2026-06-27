"use server";

import { isLocalAuthEnabled } from "@/lib/local-auth";
import { localDismissHugSignal, localGetHugState, localSendHugBack, localSendMissSignal, type LocalHugState } from "@/lib/local-store";
import { fail, ok, type Result } from "@/lib/utils/errors";

export async function getHugState(): Promise<Result<LocalHugState>> {
  if (!isLocalAuthEnabled()) return fail("SERVER", "Сигналы объятий работают только в локальном режиме.");
  return ok(await localGetHugState());
}

export async function sendMissSignal(): Promise<Result<LocalHugState>> {
  if (!isLocalAuthEnabled()) return fail("SERVER", "Сигналы объятий работают только в локальном режиме.");
  const signal = await localSendMissSignal();
  if (!signal) return fail("UNAUTHORIZED", "Сначала войди в аккаунт.");
  return ok(await localGetHugState());
}

export async function sendHugBack(input: { id: string }): Promise<Result<LocalHugState>> {
  if (!isLocalAuthEnabled()) return fail("SERVER", "Сигналы объятий работают только в локальном режиме.");
  const signal = await localSendHugBack(input.id);
  if (!signal) return fail("NOT_FOUND", "Это объятие уже не ждет ответа.");
  return ok(await localGetHugState());
}

export async function dismissHugSignal(input: { id: string }): Promise<Result<LocalHugState>> {
  if (!isLocalAuthEnabled()) return fail("SERVER", "Сигналы объятий работают только в локальном режиме.");
  const signal = await localDismissHugSignal(input.id);
  if (!signal) return fail("NOT_FOUND", "Объятие не найдено.");
  return ok(await localGetHugState());
}
