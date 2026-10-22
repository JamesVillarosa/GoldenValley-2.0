import { describe, expect, it } from "vitest";
import { redirect } from "next/navigation";
import { safe, unwrapped } from "@/lib/result";

describe("safe / unwrapped", () => {
  it("carries the error message across as data and back", async () => {
    const action = safe(async (n: number) => {
      if (n < 0) throw new Error("Current PIN is wrong.");
      return n * 2;
    });
    expect(await action(2)).toEqual({ ok: true, value: 4 });
    expect(await action(-1)).toEqual({ ok: false, error: "Current PIN is wrong." });
    await expect(unwrapped(action)(-1)).rejects.toThrow("Current PIN is wrong.");
  });
  it("lets redirects through so navigation still works", async () => {
    await expect(safe(async () => redirect("/"))()).rejects.toThrow("NEXT_REDIRECT");
  });
});
