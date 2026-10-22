import { describe, expect, it } from "vitest";
import { alarmFor } from "@/lib/alarm";

describe("alarmFor", () => {
  it.each([
    ["12:59", false, false, false, null],
    ["13:00", false, false, false, "lunch"],
    ["13:00", false, true, false, null],
    ["18:29", false, true, false, null],
    ["18:30", false, true, false, "evening"],
    ["18:30", false, true, true, null],
    ["20:00", false, false, false, "lunch"],
    ["19:00", true, false, false, null],
  ])("at %s closed=%s sales=%s checked=%s rings %s", (time, closed, sales, checked, expected) => {
    expect(alarmFor(time, closed, sales, checked)).toBe(expected);
  });
});
