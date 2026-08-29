"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateManualInterval } from "@/lib/actions/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function IntervalOverrideForm({
  customerId,
  manualIntervalDays,
}: {
  customerId: string;
  manualIntervalDays: number | null;
}) {
  const [value, setValue] = useState(manualIntervalDays?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const isOverridden = manualIntervalDays !== null;

  async function handleSave() {
    const parsed = value.trim() ? Number(value) : null;
    if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0)) {
      toast.error("Enter a positive number of days, or clear it.");
      return;
    }

    setSaving(true);
    try {
      await updateManualInterval(customerId, parsed);
      toast.success(
        parsed ? `Delivery interval set to ${parsed} days` : "Back to auto-calculated interval"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="mb-1 text-sm font-medium text-[var(--color-ink)]">
        Manual delivery interval
      </p>
      <p className="mb-3 text-xs text-[var(--color-ink-muted)]">
        {isOverridden
          ? "Overriding the auto-calculated interval below."
          : "Leave blank to keep using the auto-calculated interval from delivery history."}
      </p>
      <div className="flex gap-2">
        <Input
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="Days between deliveries"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button
          variant="secondary"
          onClick={handleSave}
          disabled={saving}
          className="shrink-0"
        >
          Save
        </Button>
      </div>
    </div>
  );
}
