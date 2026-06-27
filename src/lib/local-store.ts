import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { LOCAL_AUTH_COOKIE, getLocalProfiles, localUserId } from "@/lib/local-auth";
import { anniversaryStart, getSeedReasons, relationshipStartDate } from "@/lib/reasons";
import type { Couple, LoveCounter, LoveReason, Memory, Profile, SecretMessage, TimeCapsule } from "@/types/domain";
import type { MemoryWithPhotos } from "@/lib/actions/memories";
import type { CapsuleWithPhotos } from "@/lib/actions/capsules";

type LocalData = {
  memories: Memory[];
  reasons: LoveReason[];
  capsules: TimeCapsule[];
  counters: LoveCounter[];
  messages: SecretMessage[];
  hugs: LocalHugSignal[];
};

export type LocalHugSignal = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: "missing" | "hugged";
  created_at: string;
  hugged_at: string | null;
  sender_seen_at: string | null;
};

const DATA_PATH = path.join(process.cwd(), "work", "local-data.json");
const now = () => new Date().toISOString();

function emptyData(): LocalData {
  return { memories: [], reasons: [], capsules: [], counters: [], messages: [], hugs: [] };
}

async function readData(): Promise<LocalData> {
  try {
    const raw = await readFile(DATA_PATH, "utf8");
    return { ...emptyData(), ...(JSON.parse(raw) as Partial<LocalData>) };
  } catch {
    return emptyData();
  }
}

async function writeData(data: LocalData): Promise<void> {
  // Vercel serverless has a read-only filesystem, so the local JSON store cannot work there.
  if (process.env.VERCEL === "1") {
    throw new Error("LocalStoreDisabledOnVercel");
  }
  await mkdir(path.dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
}

export function getLocalCurrentUser(): Profile | null {
  const login = cookies().get(LOCAL_AUTH_COOKIE)?.value;
  if (!login) return null;
  return getLocalProfiles().find((profile) => profile.id === localUserId(login)) ?? null;
}

export function getLocalPartner(): Profile | null {
  const current = getLocalCurrentUser();
  if (!current) return null;
  return getLocalProfiles().find((profile) => profile.id !== current.id) ?? null;
}

export function getLocalCouple(): Couple {
  return {
    id: "local-couple",
    name: "Наше Облачко",
    anniversary_date: relationshipStartDate(),
    invite_code: "LOCAL",
    created_by: "local",
    created_at: now(),
    updated_at: now()
  };
}

export type LocalHugState = {
  currentUserId: string | null;
  currentName: string | null;
  currentGender: "male" | "female" | "unspecified" | null;
  partnerName: string | null;
  partnerGender: "male" | "female" | "unspecified" | null;
  incoming: (LocalHugSignal & { senderName: string }) | null;
  outgoing: (LocalHugSignal & { recipientName: string }) | null;
};

function displayNameById(id: string): string {
  if (id === "local-maxim") return "Максимка";
  if (id === "local-vika") return "Вика";
  return getLocalProfiles().find((profile) => profile.id === id)?.display_name ?? "Любимый человек";
}

function genderById(id: string): "male" | "female" | "unspecified" {
  const profile = getLocalProfiles().find((p) => p.id === id);
  if (!profile) return "unspecified";
  const g = profile.gender;
  if (g === "male" || g === "female") return g;
  return "unspecified";
}

export async function localGetHugState(): Promise<LocalHugState> {
  const current = getLocalCurrentUser();
  const partner = getLocalPartner();
  if (!current || !partner) {
    return { currentUserId: current?.id ?? null, currentName: current?.display_name ?? null, currentGender: current ? genderById(current.id) : null, partnerName: partner?.display_name ?? null, partnerGender: partner ? genderById(partner.id) : null, incoming: null, outgoing: null };
  }

  const data = await readData();
  const sorted = [...data.hugs].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const incoming = sorted.find((signal) => signal.recipient_id === current.id && signal.status === "missing") ?? null;
  const outgoing =
    sorted.find(
      (signal) =>
        signal.sender_id === current.id &&
        signal.recipient_id === partner.id &&
        (signal.status === "missing" || (signal.status === "hugged" && !signal.sender_seen_at))
    ) ?? null;

  return {
    currentUserId: current.id,
    currentName: displayNameById(current.id),
    currentGender: genderById(current.id),
    partnerName: displayNameById(partner.id),
    partnerGender: genderById(partner.id),
    incoming: incoming ? { ...incoming, senderName: displayNameById(incoming.sender_id) } : null,
    outgoing: outgoing ? { ...outgoing, recipientName: displayNameById(outgoing.recipient_id) } : null
  };
}

export async function localSendMissSignal(): Promise<LocalHugSignal | null> {
  const current = getLocalCurrentUser();
  const partner = getLocalPartner();
  if (!current || !partner) return null;

  const data = await readData();
  const existing = data.hugs.find((signal) => signal.sender_id === current.id && signal.recipient_id === partner.id && signal.status === "missing");
  if (existing) return existing;

  const signal: LocalHugSignal = {
    id: crypto.randomUUID(),
    sender_id: current.id,
    recipient_id: partner.id,
    status: "missing",
    created_at: now(),
    hugged_at: null,
    sender_seen_at: null
  };
  data.hugs.push(signal);
  await writeData(data);
  return signal;
}

export async function localSendHugBack(id: string): Promise<LocalHugSignal | null> {
  const current = getLocalCurrentUser();
  if (!current) return null;

  const data = await readData();
  const signal = data.hugs.find((item) => item.id === id && item.recipient_id === current.id && item.status === "missing");
  if (!signal) return null;

  signal.status = "hugged";
  signal.hugged_at = now();
  await writeData(data);
  return signal;
}

export async function localDismissHugSignal(id: string): Promise<LocalHugSignal | null> {
  const current = getLocalCurrentUser();
  if (!current) return null;

  const data = await readData();
  const signal = data.hugs.find((item) => item.id === id && item.sender_id === current.id);
  if (!signal) return null;

  signal.sender_seen_at = now();
  await writeData(data);
  return signal;
}

export async function localListMemories(): Promise<MemoryWithPhotos[]> {
  const data = await readData();
  return data.memories.map((memory) => ({ ...memory, photos: [] })).sort((a, b) => b.memory_date.localeCompare(a.memory_date));
}

export async function localCreateMemory(input: { memoryDate: string; title: string; body: string }): Promise<Memory> {
  const user = getLocalCurrentUser();
  const data = await readData();
  const memory: Memory = {
    id: crypto.randomUUID(),
    couple_id: "local-couple",
    author_id: user?.id ?? "local",
    memory_date: input.memoryDate,
    title: input.title,
    body: input.body,
    created_at: now(),
    updated_at: now()
  };
  data.memories.unshift(memory);
  await writeData(data);
  return memory;
}

export async function localDeleteMemory(id: string): Promise<void> {
  const data = await readData();
  data.memories = data.memories.filter((memory) => memory.id !== id);
  await writeData(data);
}

export async function localListReasons(): Promise<LoveReason[]> {
  const data = await readData();
  const editedReasons = new Map(data.reasons.map((reason) => [reason.number, reason]));
  return getSeedReasons().map((reason) => editedReasons.get(reason.number) ?? reason).sort((a, b) => a.number - b.number);
}

export async function localAddReason(text: string): Promise<LoveReason> {
  const user = getLocalCurrentUser();
  const data = await readData();
  const reason: LoveReason = {
    id: crypto.randomUUID(),
    couple_id: "local-couple",
    author_id: user?.id ?? "local",
    number: Math.min(getSeedReasons().length + data.reasons.length + 1, 365),
    text,
    created_at: now(),
    updated_at: now()
  };
  data.reasons.push(reason);
  await writeData(data);
  return reason;
}

export async function localDeleteReason(id: string): Promise<void> {
  const data = await readData();
  data.reasons = data.reasons.filter((reason) => reason.id !== id).map((reason, index) => ({ ...reason, number: index + 1 }));
  await writeData(data);
}

export async function localListCapsules(): Promise<CapsuleWithPhotos[]> {
  const data = await readData();
  return data.capsules.map((capsule) => ({ ...capsule, photos: [] })).sort((a, b) => a.open_at.localeCompare(b.open_at));
}

export async function localCreateCapsule(input: { title: string; body: string; openAt: string }): Promise<TimeCapsule> {
  const user = getLocalCurrentUser();
  const canOpen = new Date(input.openAt).getTime() <= Date.now();
  const data = await readData();
  const capsule: TimeCapsule = {
    id: crypto.randomUUID(),
    couple_id: "local-couple",
    author_id: user?.id ?? "local",
    title: input.title,
    body: canOpen ? input.body : null,
    open_at: input.openAt,
    is_opened: canOpen,
    opened_at: canOpen ? now() : null,
    created_at: now(),
    updated_at: now(),
    can_open: canOpen
  };
  data.capsules.push(capsule);
  await writeData(data);
  return capsule;
}

export async function localOpenCapsule(id: string): Promise<TimeCapsule | null> {
  const data = await readData();
  const capsule = data.capsules.find((item) => item.id === id);
  if (!capsule || new Date(capsule.open_at).getTime() > Date.now()) return null;
  capsule.is_opened = true;
  capsule.opened_at = now();
  capsule.can_open = true;
  await writeData(data);
  return capsule;
}

export async function localListCounters(): Promise<LoveCounter[]> {
  const data = await readData();
  const rawDays = (Date.now() - anniversaryStart(relationshipStartDate()).getTime()) / 86_400_000;
  const daysTogether = Number.isFinite(rawDays) ? Math.max(0, Math.floor(rawDays)) : 0;
  const defaults: LoveCounter[] = [
    {
      id: "local-days-together",
      couple_id: "local-couple",
      label: "Дни вместе",
      emoji: "☁",
      value: daysTogether,
      computedValue: daysTogether,
      is_auto: true,
      created_at: new Date(0).toISOString(),
      updated_at: now()
    },
    {
      id: "local-love-infinity",
      couple_id: "local-couple",
      label: "Любовь",
      emoji: "∞",
      value: 0,
      computedValue: Number.POSITIVE_INFINITY,
      is_auto: true,
      created_at: new Date(0).toISOString(),
      updated_at: now()
    },
    {
      id: "local-kisses-infinity",
      couple_id: "local-couple",
      label: "Поцелуев",
      emoji: "\u{1F48B}",
      value: 0,
      computedValue: Number.POSITIVE_INFINITY,
      is_auto: true,
      created_at: new Date(0).toISOString(),
      updated_at: now()
    }
  ];
  return [...defaults, ...data.counters];
}

export async function localCreateCounter(input: { label: string; emoji?: string | null; value: number; isAuto: boolean }): Promise<LoveCounter> {
  const data = await readData();
  const counter: LoveCounter = {
    id: crypto.randomUUID(),
    couple_id: "local-couple",
    label: input.label,
    emoji: input.emoji ?? null,
    value: input.value,
    is_auto: input.isAuto,
    created_at: now(),
    updated_at: now()
  };
  data.counters.push(counter);
  await writeData(data);
  return counter;
}

export async function localIncrementCounter(id: string, delta: number): Promise<LoveCounter | null> {
  const data = await readData();
  const counter = data.counters.find((item) => item.id === id);
  if (!counter) return null;
  counter.value = Math.max(0, counter.value + delta);
  counter.updated_at = now();
  await writeData(data);
  return counter;
}

export async function localDeleteCounter(id: string): Promise<void> {
  const data = await readData();
  data.counters = data.counters.filter((counter) => counter.id !== id);
  await writeData(data);
}

export async function localListMessages(): Promise<SecretMessage[]> {
  const data = await readData();
  return data.messages.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function localCountUnreadMessages(userId: string): Promise<number> {
  const data = await readData();
  const currentMs = Date.now();
  return data.messages.filter((message) => {
    if (message.recipient_id !== userId) return false;
    if (message.is_read) return false;
    if (message.reveal_at && new Date(message.reveal_at).getTime() > currentMs) return false;
    return true;
  }).length;
}

export async function localSendMessage(input: { recipientId: string; body: string; revealAt?: string | null }): Promise<SecretMessage> {
  const user = getLocalCurrentUser();
  const revealed = !input.revealAt || new Date(input.revealAt).getTime() <= Date.now();
  const data = await readData();
  const message: SecretMessage = {
    id: crypto.randomUUID(),
    couple_id: "local-couple",
    sender_id: user?.id ?? "local",
    recipient_id: input.recipientId,
    body: revealed ? input.body : null,
    reveal_at: input.revealAt ?? null,
    is_read: false,
    read_at: null,
    created_at: now(),
    is_revealed: revealed
  };
  data.messages.push(message);
  await writeData(data);
  return message;
}

export async function localMarkMessageRead(id: string): Promise<SecretMessage | null> {
  const data = await readData();
  const message = data.messages.find((item) => item.id === id);
  if (!message) return null;
  message.is_read = true;
  message.read_at = now();
  await writeData(data);
  return message;
}
