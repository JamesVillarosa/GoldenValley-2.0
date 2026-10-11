export const peso = (n: number) =>
  `${n < 0 ? "-" : ""}₱${Math.abs(Number(n)).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;

export const gal = (n: number) => `${Number(n).toLocaleString("en-PH")} ${Number(n) === 1 ? "gallon" : "gallons"}`;

/** What a customer pays: single gallons at `price_per_gallon`, and when a deal
 * is set, every full group of `price_qty` gallons at `deal_price`. */
export interface Pricing {
  price_per_gallon: number | null;
  price_qty: number;
  deal_price: number | null;
}

/** Pesos for `gallons`. With "50 for 3, 20 for 1": 3 = 50, 4 = 70, 7 = 120. */
export function amountFor(gallons: number, pricing: Pricing | null | undefined, fallbackPrice: number): number {
  const single = Number(pricing?.price_per_gallon ?? fallbackPrice);
  const qty = pricing?.price_qty ?? 1;
  if (qty > 1 && pricing?.deal_price != null) {
    return Math.floor(gallons / qty) * Number(pricing.deal_price) + (gallons % qty) * single;
  }
  return gallons * single;
}

/** "₱20 each" or "₱20 each, ₱50 for 3 gallons". */
export const priceLabel = (pricing: Pricing) =>
  `${peso(Number(pricing.price_per_gallon))} each` +
  (pricing.price_qty > 1 && pricing.deal_price != null ? `, ${peso(pricing.deal_price)} for ${gal(pricing.price_qty)}` : "");
