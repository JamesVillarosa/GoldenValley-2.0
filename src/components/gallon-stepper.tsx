"use client";

import { useState } from "react";
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
  // What is being typed. It may be empty while the old number is erased; the
  // last valid number stays in `value` and comes back if the box is left empty.
  const [typing, setTyping] = useState<string | null>(null);
  const step = (next: number) => {
    setTyping(null);
    onChange(Math.max(min, next));
  };

  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => step(value - 1)} className={BUTTON}>
        <Minus size={18} weight="bold" />
      </button>

      {/* Typing is faster than tapping for a 20-gallon order. */}
      <input
        aria-label={label}
        inputMode="numeric"
        enterKeyHint="done"
        value={typing ?? value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          setTyping(digits);
          if (Number(digits) >= min) onChange(Number(digits));
        }}
        onBlur={() => setTyping(null)}
        // Enter (the keypad's Done) puts the keyboard away.
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="num h-12 w-16 rounded-md bg-transparent text-center text-[1.75rem] font-semibold text-ink outline-none focus:bg-mist"
      />

      <button type="button" aria-label={`Increase ${label}`} onClick={() => step(value + 1)} className={BUTTON}>
        <Plus size={18} weight="bold" />
      </button>
    </div>
  );
}
