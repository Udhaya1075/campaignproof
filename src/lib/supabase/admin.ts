import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "../env.ts";

/**
 * Service-role client: bypasses RLS. SERVER ONLY. Used exclusively for the encrypted
 * buffer_tokens table and connection bookkeeping. Never import this from a client component.
 */
export function supabaseAdmin() {
  const env = serverEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
