import { describe, expect, it } from "vitest";
import { amountFor, gal, peso, priceLabel } from "@/lib/format";

const deal = { price_per_gallon: 20, price_qty: 3, deal_price: 50 };

describe("amountFor", () => {
  it("applies the deal to full groups and the single price to the rest", () => {
    expect([3, 4, 7].map((g) => amountFor(g, deal, 25))).toEqual([50, 70, 120]);
  });
  it("uses the customer price without a deal", () => {
    expect(amountFor(5, { price_per_gallon: 22, price_qty: 1, deal_price: null }, 25)).toBe(110);
  });
  it("falls back to the station price for walk-ins", () => {
    expect(amountFor(4, null, 25)).toBe(100);
  });
});

describe("labels", () => {
  it("formats pesos, negatives included", () => {
    expect(peso(1234.5)).toBe("₱1,234.5");
    expect(peso(-20)).toBe("-₱20");
  });
  it("singularizes one gallon", () => {
    expect(gal(1)).toBe("1 gallon");
    expect(gal(1000)).toBe("1,000 gallons");
  });
  it("shows the deal in the price label", () => {
    expect(priceLabel(deal)).toBe("₱20 each, ₱50 for 3 gallons");
  });
});
