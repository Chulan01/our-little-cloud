import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { normalizeSupabaseUrl } from "@/lib/env";
import type { Database } from "@/types/database.types";
import type { LocalGenericSchema } from "@/types/supabase-generic";

type PublicSchema = Database["public"] & LocalGenericSchema;

export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database, "public", PublicSchema>(
    normalizeSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        }
      }
    }
  );
}
