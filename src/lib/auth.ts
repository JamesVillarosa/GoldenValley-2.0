import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "gv_session";

// The service role key never leaves the server, so it doubles as the signing
// secret: no extra env var to configure.
function sign(value: string) {
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update(value).digest("hex");
}

// shortcut: one stateless token for every device, so changing the PIN does not
// sign other phones out. Upgrade to per-device sessions if staff ever get access.
export const sessionToken = () => sign("gv-session-v1");
export const hashPin = (pin: string) => sign(`pin:${pin}`);

export function isValidSession(token: string | undefined) {
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(sessionToken());
  return a.length === b.length && timingSafeEqual(a, b);
}
