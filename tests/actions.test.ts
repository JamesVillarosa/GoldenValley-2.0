import { beforeEach, describe, expect, it, vi } from "vitest";

// Validation must reject bad input before the database is touched.
const db = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ db, createServiceClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { saveTransaction, setGallons } = await import("@/lib/actions/transactions");

beforeEach(() => {
  db.mockReset();
  vi.useFakeTimers({ now: new Date("2026-10-23T02:00:00Z") }); // Friday in Manila
});

const input = { customerId: "c1", driverId: "d1", gallons: 3, date: "2026-10-23" };

describe("saveTransaction validation", () => {
  it.each([
    [{ driverId: null }, "Pick a customer first."],
    [{ gallons: 0 }, "Gallons must be a positive number."],
    [{ gallons: Number.NaN }, "Gallons must be a positive number."],
    [{ date: "2026-10-24" }, "Delivery date cannot be in the future."],
    [{ date: "23/10/2026" }, "Delivery date cannot be in the future."],
    [{ date: "2026-10-18" }, "The station is closed on Sundays. Pick another day."],
  ])("rejects %o", async (patch, error) => {
    expect(await saveTransaction({ ...input, ...patch })).toEqual({ ok: false, error });
    expect(db).not.toHaveBeenCalled();
  });

  it("rejects a negative walk-in price", async () => {
    const chain = { select: () => chain, single: async () => ({ data: { price_per_gallon: 25 }, error: null }) };
    db.mockResolvedValue({ from: () => chain });
    const result = await saveTransaction({ customerId: null, driverId: null, gallons: 2, date: "2026-10-23", price: -1 });
    expect(result).toEqual({ ok: false, error: "Price must be 0 or more." });
  });

  it("rejects editing a sale down to zero gallons", async () => {
    expect(await setGallons("t1", 0)).toEqual({ ok: false, error: "Gallons must be a positive number." });
  });
});
