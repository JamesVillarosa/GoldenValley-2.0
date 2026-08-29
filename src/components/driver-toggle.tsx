"use client";

import { cn } from "@/lib/utils";
import type { Driver } from "@/lib/supabase/types";

export function DriverToggle({
  drivers,
  value,
  onChange,
}: {
  drivers: Driver[];
  value: string;
  onChange: (driverId: string) => void;
}) {
  return (
    <div className="flex rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
      {drivers.map((driver) => {
        const active = driver.id === value;
        return (
          <button
            key={driver.id}
            type="button"
            onClick={() => onChange(driver.id)}
            className={cn(
              "flex-1 rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium font-display transition-colors duration-150",
              active
                ? "bg-[var(--color-deep-blue)] text-white"
                : "text-[var(--color-ink-muted)]"
            )}
          >
            {driver.name}
          </button>
        );
      })}
    </div>
  );
}
