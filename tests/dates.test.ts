import { afterEach, describe, expect, it, vi } from "vitest";
import { isClosed, lastWorkday, manilaToday, resolveRange, shiftDays, stepWorkday } from "@/lib/dates";

afterEach(() => vi.useRealTimers());

describe("manilaToday", () => {
  it("is already tomorrow in Manila at 16:00 UTC", () => {
    vi.useFakeTimers({ now: new Date("2026-10-23T16:00:00Z") });
    expect(manilaToday()).toBe("2026-10-24");
  });
  it("is still today in Manila at 15:59 UTC", () => {
    vi.useFakeTimers({ now: new Date("2026-10-23T15:59:00Z") });
    expect(manilaToday()).toBe("2026-10-23");
  });
});

describe("workdays", () => {
  it("knows Sunday is closed", () => {
    expect(isClosed("2026-10-25")).toBe(true);
    expect(isClosed("2026-10-24")).toBe(false);
  });
  it("shifts across month and year ends", () => {
    expect(shiftDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("falls back from Sunday to Saturday", () => {
    expect(lastWorkday("2026-10-25")).toBe("2026-10-24");
    expect(lastWorkday("2026-10-26")).toBe("2026-10-26");
  });
  it("steps over Sunday both ways", () => {
    expect(stepWorkday("2026-10-24", 1)).toBe("2026-10-26");
    expect(stepWorkday("2026-10-26", -1)).toBe("2026-10-24");
  });
});

describe("resolveRange", () => {
  it("runs a week Monday to Saturday", () => {
    const r = resolveRange("week", "2026-10-22");
    expect([r.from, r.to]).toEqual(["2026-10-19", "2026-10-24"]);
  });
  it("buckets a year by month", () => {
    const r = resolveRange("year", "2026-06-15");
    expect([r.from, r.to, r.unit]).toEqual(["2026-01-01", "2026-12-31", "month"]);
  });
  it("turns a Sunday day view into Saturday", () => {
    expect(resolveRange("day", "2026-10-25").from).toBe("2026-10-24");
  });
  it("ignores a bad period or date", () => {
    vi.useFakeTimers({ now: new Date("2026-10-23T02:00:00Z") });
    const r = resolveRange("decade", "not-a-date");
    expect([r.period, r.from, r.label]).toEqual(["day", "2026-10-23", "Today"]);
  });
});
