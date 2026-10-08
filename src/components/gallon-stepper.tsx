"use client";

import { Minus, Plus } from "@phosphor-icons/react/dist/ssr";

const BUTTON =
  "press grid h-12 w-12 place-items-center rounded-pill border border-border bg-mist text-deep-blue";

export function GallonStepper({
  value,
  onChange,
  label = "Gallons",
  min = 1,
}: {
  value: number;
  onChange: (next: number) => void;
  label?: string;
  min?: number;
}) {
  const set = (next: number) => onChange(Math.max(min, Math.round(next) || min));

  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => set(value - 1)} className={BUTTON}>
        <Minus size={18} weight="bold" />
      </button>

      {/* Typing is faster than tapping for a 20-gallon order. */}
      <input
        aria-label={label}
        inputMode="numeric"
        value={value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => set(Number(e.target.value.replace(/\D/g, "")))}
        className="num h-12 w-16 rounded-md bg-transparent text-center text-[1.75rem] font-semibold text-ink outline-none focus:bg-mist"
      />

      <button type="button" aria-label={`Increase ${label}`} onClick={() => set(value + 1)} className={BUTTON}>
        <Plus size={18} weight="bold" />
      </button>
    </div>
  );
}
