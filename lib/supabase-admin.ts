/**
 * Supabase admin client — usar APENAS em Route Handlers e Server Actions.
 * Bypassa RLS. Nunca importar em Client Components.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

function ensureSupabaseAdminEnv() {
  if (!url || !serviceRole) {
    throw new Error(
      "Supabase admin environment variables não estão configuradas. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
}

export function createAdminClient() {
  ensureSupabaseAdminEnv();
  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
