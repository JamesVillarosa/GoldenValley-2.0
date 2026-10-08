"use client";

import { Minus, Plus } from "@phosphor-icons/react/dist/ssr";

const STEP = 1;
const MIN = 1;

export function GallonStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  function set(next: number) {
    onChange(Math.max(MIN, next));
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        aria-label="Decrease gallons"
        onClick={() => set(value - STEP)}
        className="grid h-10 w-10 place-items-center rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-mist)] text-[var(--color-deep-blue)] transition-transform duration-150 ease-out active:scale-[0.9]"
      >
        <Minus size={16} weight="bold" />
      </button>

      <span className="font-display min-w-[2.5rem] text-center text-2xl font-semibold tabular-nums text-[var(--color-ink)]">
        {value}
      </span>

      <button
        type="button"
        aria-label="Increase gallons"
        onClick={() => set(value + STEP)}
        className="grid h-10 w-10 place-items-center rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-mist)] text-[var(--color-deep-blue)] transition-transform duration-150 ease-out active:scale-[0.9]"
      >
        <Plus size={16} weight="bold" />
      </button>
    </div>
  );
}
