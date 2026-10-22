import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

beforeAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
});

describe("session token", async () => {
  const { hashPin, isValidSession, sessionToken, SESSION_COOKIE } = await import("@/lib/auth");
  const { proxy } = await import("@/proxy");
  const visit = (path: string, cookie?: string) =>
    proxy(new NextRequest(`https://gv.test${path}`, { headers: cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {} }));

  it("accepts only the signed token", () => {
    expect(isValidSession(sessionToken())).toBe(true);
    expect(isValidSession(undefined)).toBe(false);
    expect(isValidSession("x".repeat(64))).toBe(false);
    expect(isValidSession("short")).toBe(false);
  });
  it("hashes different PINs differently", () => {
    expect(hashPin("1234")).not.toBe(hashPin("1235"));
    expect(hashPin("1234")).not.toBe(sessionToken());
  });
  it("sends a locked phone to /login and an unlocked one away from it", () => {
    expect(visit("/salary").headers.get("location")).toBe("https://gv.test/login");
    expect(visit("/login", sessionToken()).headers.get("location")).toBe("https://gv.test/");
    expect(visit("/salary", sessionToken()).headers.get("location")).toBeNull();
  });
});
