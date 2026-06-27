"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import type { LocalGenericSchema } from "@/types/supabase-generic";

type PublicSchema = Database["public"] & LocalGenericSchema;

export function createClient() {
  return createBrowserClient<Database, "public", PublicSchema>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}
