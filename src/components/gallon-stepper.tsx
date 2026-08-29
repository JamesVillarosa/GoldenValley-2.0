"use client";

import { Minus, Plus } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

const PRESETS = [5, 10, 20, 25] as const;
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
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-6">
        <button
          type="button"
          aria-label="Decrease gallons"
          onClick={() => set(value - STEP)}
          className="grid h-12 w-12 place-items-center rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-deep-blue)] transition-transform duration-150 ease-out active:scale-[0.93]"
        >
          <Minus size={20} weight="bold" />
        </button>

        <div className="flex min-w-[7rem] flex-col items-center">
          <span className="font-display text-4xl font-semibold tabular-nums text-[var(--color-ink)]">
            {value}
          </span>
          <span className="text-sm text-[var(--color-ink-muted)]">gallons</span>
        </div>

        <button
          type="button"
          aria-label="Increase gallons"
          onClick={() => set(value + STEP)}
          className="grid h-12 w-12 place-items-center rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-deep-blue)] transition-transform duration-150 ease-out active:scale-[0.93]"
        >
          <Plus size={20} weight="bold" />
        </button>
      </div>

      <div className="flex gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => set(preset)}
            className={cn(
              "h-9 rounded-[var(--radius-pill)] px-4 text-sm font-medium transition-colors duration-150",
              value === preset
                ? "bg-[var(--color-deep-blue)] text-white"
                : "bg-[var(--color-surface)] text-[var(--color-ink-muted)] border border-[var(--color-border)]"
            )}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
}
