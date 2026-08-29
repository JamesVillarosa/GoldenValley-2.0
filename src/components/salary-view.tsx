"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DriverToggle } from "@/components/driver-toggle";
import { Button } from "@/components/ui/button";
import { computeSalary, type SalaryResult } from "@/lib/actions/salary";
import type { Driver } from "@/lib/supabase/types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function SalaryView({ drivers }: { drivers: Driver[] }) {
  const [driverId, setDriverId] = useState(drivers[0]?.id ?? "");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [result, setResult] = useState<SalaryResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCompute() {
    setLoading(true);
    try {
      const data = await computeSalary(driverId, startDate, endDate);
      setResult(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not compute salary."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!drivers.length) {
    return (
      <p className="text-[var(--color-ink-muted)]">No drivers configured yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <DriverToggle
        drivers={drivers}
        value={driverId}
        onChange={(id) => {
          setDriverId(id);
          setResult(null);
        }}
      />

      <div className="flex gap-3">
        <label className="flex-1 text-sm">
          <span className="mb-1 block font-medium text-[var(--color-ink-muted)]">
            From
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-ink)] outline-none focus:border-[var(--color-aqua)]"
          />
        </label>
        <label className="flex-1 text-sm">
          <span className="mb-1 block font-medium text-[var(--color-ink-muted)]">
            To
          </span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-ink)] outline-none focus:border-[var(--color-aqua)]"
          />
        </label>
      </div>

      <Button onClick={handleCompute} disabled={loading} className="w-full">
        {loading ? "Computing…" : "Compute salary"}
      </Button>

      {result && (
        <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-[var(--color-ink-muted)]">
              Gallons delivered
            </span>
            <span className="font-display text-2xl font-semibold tabular-nums">
              {result.totalGallons.toLocaleString()}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-[var(--color-ink-muted)]">
              Transactions
            </span>
            <span className="font-display text-lg font-medium tabular-nums">
              {result.transactionCount.toLocaleString()}
            </span>
          </div>
          <div className="h-px bg-[var(--color-border)]" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-[var(--color-ink-muted)]">
              Base salary
            </span>
            <span className="font-display text-2xl font-semibold tabular-nums text-[var(--color-deep-blue)]">
              ₱{result.baseSalary.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
