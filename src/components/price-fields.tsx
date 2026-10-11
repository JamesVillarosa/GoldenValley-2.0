"use client";

import { Plus, X } from "@phosphor-icons/react/dist/ssr";
import { Input } from "@/components/ui/input";
import { amountFor, peso, type Pricing } from "@/lib/format";

/** What is typed into the price boxes. `dealQty` empty = no second price. */
export interface PriceDraft {
  price: string;
  dealPrice: string;
  dealQty: string;
}

export const draftOf = (pricing?: Pricing | null): PriceDraft => {
  const hasDeal = !!pricing && pricing.price_qty > 1 && pricing.deal_price != null;
  return {
    price: pricing?.price_per_gallon?.toString() ?? "",
    dealPrice: hasDeal ? String(pricing.deal_price) : "",
    dealQty: hasDeal ? String(pricing.price_qty) : "",
  };
};

/** The draft in the shape `saveCustomer` takes. */
export const pricingInput = (draft: PriceDraft) => ({
  pricePerGallon: draft.price.trim() ? Number(draft.price) : NaN,
  dealPrice: draft.dealQty && draft.dealPrice.trim() ? Number(draft.dealPrice) : null,
  dealQty: Number(draft.dealQty) || 1,
});

const ROW = "flex items-center gap-2 text-ink-muted";

/** A customer's price for 1 gallon, plus a second price for a bigger order
 * added with the plus button (50 pesos for 3, and still 20 for 1). */
export function PriceFields({ value, onChange }: { value: PriceDraft; onChange: (next: PriceDraft) => void }) {
  const set = (change: Partial<PriceDraft>) => onChange({ ...value, ...change });
  const hasDeal = value.dealQty !== "";
  const pricing = {
    price_per_gallon: Number(value.price),
    price_qty: Number(value.dealQty),
    deal_price: Number(value.dealPrice),
  };
  const worked = (gallons: number) => `${gallons} ${gallons === 1 ? "gallon" : "gallons"} = ${peso(amountFor(gallons, pricing, 0))}`;

  return (
    <div className="flex flex-col gap-2">
      <span className="field-label mb-0">Price</span>
      <div className={ROW}>
        <span>₱</span>
        <Input
          aria-label="Price for 1 gallon in pesos"
          required
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          placeholder="20"
          value={value.price}
          onChange={(e) => set({ price: e.target.value })}
          className="min-w-0 flex-1"
        />
        <span className="shrink-0">for 1 gallon</span>
      </div>

      {hasDeal ? (
        <>
          <div className={ROW}>
            <span>₱</span>
            <Input
              aria-label="Second price in pesos"
              required
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              placeholder="50"
              value={value.dealPrice}
              onChange={(e) => set({ dealPrice: e.target.value })}
              className="min-w-0 flex-1 px-3"
            />
            <span className="shrink-0">for</span>
            <Input
              aria-label="Gallons for the second price"
              required
              type="number"
              min={2}
              step={1}
              inputMode="numeric"
              value={value.dealQty}
              onFocus={(e) => e.target.select()}
              onChange={(e) => set({ dealQty: e.target.value || "0" })}
              className="w-14 shrink-0 px-1 text-center"
            />
            <span className="shrink-0">gallons</span>
            <button
              type="button"
              aria-label="Remove the second price"
              onClick={() => set({ dealPrice: "", dealQty: "" })}
              className="press grid h-11 w-9 shrink-0 place-items-center rounded-pill"
            >
              <X size={18} />
            </button>
          </div>
          {value.price && value.dealPrice && pricing.price_qty > 1 && (
            <ul className="num flex flex-wrap gap-x-4 text-sm text-ink-muted">
              {[1, pricing.price_qty, pricing.price_qty + 1].map((g) => (
                <li key={g}>{worked(g)}</li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => set({ dealQty: "3" })}
          className="press flex h-11 items-center gap-1.5 self-start font-display text-[0.9375rem] font-semibold text-deep-blue"
        >
          <Plus size={16} weight="bold" />
          Add a price for more gallons
        </button>
      )}
    </div>
  );
}
