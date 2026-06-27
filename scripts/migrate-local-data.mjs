#!/usr/bin/env node
/**
 * One-shot migration from `work/local-data.json` to Supabase.
 *
 * Usage:
 *   # Dry-run (default): print what would be inserted without writing.
 *   pnpm tsx scripts/migrate-local-data.mjs \
 *     --max-email=maxim@example.com --vika-email=vika@example.com
 *
 *   # Apply migration:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   pnpm tsx scripts/migrate-local-data.mjs \
 *     --max-email=maxim@example.com --vika-email=vika@example.com --apply
 *
 * Notes:
 * - The script is idempotent on primary keys: re-running with --apply is safe
 *   and will upsert only rows whose UUID matches a row in the JSON.
 * - It does NOT deduplicate content-wise — running `seed_demo` first and the
 *   script after may create two memories with the same title. Either skip
 *   `seed_demo` before running the script, or use the script only (read the
 *   README's "Lock-down" section for guidance on the canonical order).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
function flag(name) {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=").slice(1).join("=") : null;
}
function hasFlag(name) {
  return args.includes(`--${name}`);
}

const APPLY = hasFlag("apply");
const MAX_EMAIL = flag("max-email");
const VIKA_EMAIL = flag("vika-email");
const SUPA_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MAX_EMAIL || !VIKA_EMAIL) {
  console.error("ERROR: pass --max-email=... --vika-email=...");
  process.exit(1);
}
if (!SUPA_URL || !SUPA_KEY) {
  console.error("ERROR: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const dataPath = path.join(process.cwd(), "work", "local-data.json");
const raw = JSON.parse(readFileSync(dataPath, "utf8"));
const { memories = [], counters = [], messages = [], hugs = [], capsules = [] } = raw;
if (raw.reasons?.length) {
  console.warn(
    `[info] reasons[] in local-data.json has ${raw.reasons.length} entries — ` +
      "skipped because the seed file (src/data/reasons.txt) is already projected by the app."
  );
}

const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const log = (...lines) => console.log(APPLY ? "[apply] " : "[dry-run] ", ...lines);
const MAX_PAGES = 20;

async function findProfileByEmail(email) {
  let page = 1;
  const perPage = 200;
  while (page <= MAX_PAGES) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    if (!data || data.users.length === 0) return null;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return { userId: found.id, email: found.email };
    if (data.users.length < perPage) return null;
    page += 1;
  }
  console.warn(`[warn] no auth user matching ${email} after ${MAX_PAGES} pages of ${perPage}`);
  return null;
}

async function getOrSeedCouple() {
  const { data, error } = await supabase.rpc("seed_demo", {
    p_max_email: MAX_EMAIL,
    p_vika_email: VIKA_EMAIL
  });
  if (error) throw error;
  return data;
}

async function upsertMemories(maxUuid, coupleId) {
  if (!memories.length) return;
  log(`memories   ×${memories.length} couple=${coupleId} author=${maxUuid}`);
  const rows = memories.map((m) => ({
    id: m.id,
    couple_id: coupleId,
    author_id: maxUuid,
    memory_date: m.memory_date,
    title: m.title,
    body: m.body,
    created_at: m.created_at,
    updated_at: m.updated_at
  }));
  if (!APPLY) return;
  const { error } = await supabase.from("memories").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

async function upsertCounters(coupleId) {
  if (!counters.length) return;
  log(`counters   ×${counters.length} couple=${coupleId}`);
  const rows = counters.map((c) => ({
    id: c.id,
    couple_id: coupleId,
    label: c.label,
    emoji: c.emoji ?? null,
    value: c.value,
    is_auto: c.is_auto ?? false,
    created_at: c.created_at ?? new Date().toISOString(),
    updated_at: c.updated_at ?? new Date().toISOString()
  }));
  if (!APPLY) return;
  const { error } = await supabase.from("love_counters").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

async function upsertMessages(maxUuid, vikaUuid, coupleId) {
  if (!messages.length) return;
  log(`messages   ×${messages.length} couple=${coupleId}`);
  const senderMap = { "local-maxim": maxUuid, "local-vika": vikaUuid };
  const rows = messages.map((m) => ({
    id: m.id,
    couple_id: coupleId,
    sender_id: senderMap[m.sender_id] ?? maxUuid,
    recipient_id: senderMap[m.recipient_id] ?? vikaUuid,
    body: m.body,
    reveal_at: m.reveal_at ?? null,
    is_read: m.is_read ?? false,
    read_at: m.read_at ?? null,
    created_at: m.created_at
  }));
  if (!APPLY) return;
  const { error } = await supabase.from("secret_messages").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

async function upsertHugs(maxUuid, vikaUuid, coupleId) {
  if (!hugs.length) return;
  log(`hugs       ×${hugs.length} couple=${coupleId}`);
  const senderMap = { "local-maxim": maxUuid, "local-vika": vikaUuid };
  const rows = hugs.map((h) => ({
    id: h.id,
    couple_id: coupleId,
    sender_id: senderMap[h.sender_id] ?? maxUuid,
    recipient_id: senderMap[h.recipient_id] ?? vikaUuid,
    status: h.status,
    created_at: h.created_at,
    hugged_at: h.hugged_at ?? null,
    sender_seen_at: h.sender_seen_at ?? null
  }));
  if (!APPLY) return;
  const { error } = await supabase.from("hug_signals").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

async function upsertCapsules(maxUuid, coupleId) {
  if (!capsules.length) return;
  log(`capsules   ×${capsules.length} couple=${coupleId}`);
  const rows = capsules.map((c) => ({
    id: c.id,
    couple_id: coupleId,
    author_id: maxUuid,
    title: c.title,
    body: c.body,
    open_at: c.open_at,
    is_opened: c.is_opened ?? false,
    opened_at: c.opened_at ?? null,
    created_at: c.created_at ?? new Date().toISOString(),
    updated_at: c.updated_at ?? new Date().toISOString()
  }));
  if (!APPLY) return;
  const { error } = await supabase.from("time_capsules").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

(async () => {
  log(`source: ${dataPath}`);
  log(`mode:   ${APPLY ? "APPLY" : "dry-run (add --apply to push)"}`);

  const max = await findProfileByEmail(MAX_EMAIL);
  const vika = await findProfileByEmail(VIKA_EMAIL);
  if (!max || !vika) {
    console.error(
      `ERROR: could not find auth users for ${MAX_EMAIL} / ${VIKA_EMAIL}. ` +
        `Make sure both accounts exist in Supabase (Authentication → Users) before migration.`
    );
    process.exit(1);
  }
  log(`Maxim: ${MAX_EMAIL} -> ${max.userId}`);
  log(`Vika:  ${VIKA_EMAIL} -> ${vika.userId}`);

  const coupleId = await getOrSeedCouple();
  log(`couple:  ${coupleId}`);

  await upsertMemories(max.userId, coupleId);
  await upsertCounters(coupleId);
  await upsertMessages(max.userId, vika.userId, coupleId);
  await upsertHugs(max.userId, vika.userId, coupleId);
  await upsertCapsules(max.userId, coupleId);

  log("done.");
})();
