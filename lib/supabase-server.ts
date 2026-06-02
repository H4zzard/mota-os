/**
 * Supabase server client — usar APENAS em Server Components, Route Handlers e Server Actions.
 * Nunca importar em Client Components ("use client").
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function ensureSupabaseClientEnv() {
  if (!url || !anon) {
    throw new Error(
      "Supabase client environment variables não estão configuradas. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
}

export async function createClient() {
  ensureSupabaseClientEnv();
  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // chamado de Server Component — middleware já persiste os cookies
        }
      },
    },
  });
}
