"use client";

import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 overflow-x-auto rounded-pill border border-border bg-surface p-1 [scrollbar-width:none]"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-11 min-w-fit flex-1 rounded-pill px-4 font-display text-[0.9375rem] font-medium whitespace-nowrap transition-colors duration-150",
              active ? "bg-deep-blue text-white" : "text-ink-muted"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
