"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, hashPin, sessionToken } from "@/lib/auth";
import { createServiceClient, db } from "@/lib/supabase/server";

const PIN_FORMAT = /^\d{4,8}$/;
const MAX_FAILS = 5;
const LOCK_MINUTES = 5;

export async function hasPin(): Promise<boolean> {
  const { data } = await createServiceClient().from("settings").select("pin_hash").single();
  return !!data?.pin_hash;
}

/** Returns an error message, or redirects home once unlocked. The first PIN
 * ever entered becomes the manager's PIN. */
export async function unlock(pin: string): Promise<string> {
  if (!PIN_FORMAT.test(pin)) return "PIN must be 4 to 8 digits.";

  const supabase = createServiceClient();
  const { data: settings, error } = await supabase
    .from("settings")
    .select("pin_hash, pin_fails, pin_locked_until")
    .single();
  if (error) return "Could not reach the database. Try again.";

  if (settings.pin_locked_until && new Date(settings.pin_locked_until) > new Date()) {
    return `Too many wrong tries. Wait ${LOCK_MINUTES} minutes.`;
  }

  if (settings.pin_hash && settings.pin_hash !== hashPin(pin)) {
    const fails = settings.pin_fails + 1;
    const locked = fails >= MAX_FAILS;
    await supabase
      .from("settings")
      .update({
        pin_fails: locked ? 0 : fails,
        pin_locked_until: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
      })
      .eq("id", true);
    return locked ? `Too many wrong tries. Wait ${LOCK_MINUTES} minutes.` : "Wrong PIN.";
  }

  await supabase
    .from("settings")
    .update({ pin_hash: hashPin(pin), pin_fails: 0, pin_locked_until: null })
    .eq("id", true);

  (await cookies()).set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/");
}

export async function changePin(current: string, next: string): Promise<void> {
  if (!PIN_FORMAT.test(next)) throw new Error("New PIN must be 4 to 8 digits.");
  const supabase = await db();
  const { data } = await supabase.from("settings").select("pin_hash").single();
  if (data?.pin_hash !== hashPin(current)) throw new Error("Current PIN is wrong.");
  const { error } = await supabase.from("settings").update({ pin_hash: hashPin(next) }).eq("id", true);
  if (error) throw new Error(error.message);
}

export async function lock(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
