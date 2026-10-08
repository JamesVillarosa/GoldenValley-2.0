import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

/**
 * Server-only Supabase client using the service role key. Every table has RLS
 * enabled with no permissive policies, so this is the only client that can
 * read or write data. Use `db()` everywhere except the PIN check itself.
 */
export function createServiceClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/** Service client for an unlocked session. Server Actions are public HTTP
 * endpoints, so the PIN session is checked here and not only in the proxy. */
export async function db() {
  const store = await cookies();
  if (!isValidSession(store.get(SESSION_COOKIE)?.value)) {
    throw new Error("Locked. Enter your PIN again.");
  }
  return createServiceClient();
}
