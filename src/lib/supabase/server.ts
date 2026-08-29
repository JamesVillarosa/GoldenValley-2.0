import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service role key. Never import this
 * from a Client Component; every table has RLS enabled with no permissive
 * policies, so this is the only client that can read or write data. All
 * database access happens through Server Actions.
 */
export function createServiceClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.local.example to .env.local and fill in local (or project) Supabase credentials."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
