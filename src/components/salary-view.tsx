"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DriverToggle } from "@/components/driver-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { computeSalary, type SalaryResult } from "@/lib/actions/salary";
import { updateDriverRates } from "@/lib/actions/drivers";
import { resetDriverDay } from "@/lib/actions/transactions";
import type { Driver } from "@/lib/supabase/types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function SalaryView({ drivers: initialDrivers }: { drivers: Driver[] }) {
  const [drivers, setDrivers] = useState(initialDrivers);
  const [driverId, setDriverId] = useState(initialDrivers[0]?.id ?? "");
  const [result, setResult] = useState<SalaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const driver = drivers.find((d) => d.id === driverId);
  const [dailySalary, setDailySalary] = useState(driver?.base_salary ?? 0);
  const [ratePerGallon, setRatePerGallon] = useState(driver?.rate_per_gallon ?? 0);

  useEffect(() => {
    setDailySalary(driver?.base_salary ?? 0);
    setRatePerGallon(driver?.rate_per_gallon ?? 0);
  }, [driver?.base_salary, driver?.rate_per_gallon]);

  async function handleCompute() {
    if (!driverId) return;
    setLoading(true);
    try {
      const data = await computeSalary(driverId, today());
      setResult(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not compute salary."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    handleCompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  async function handleSaveRates() {
    setSavingRates(true);
    try {
      const updated = await updateDriverRates(driverId, dailySalary, ratePerGallon);
      setDrivers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      toast.success("Rates saved.");
      handleCompute();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save rates.");
    } finally {
      setSavingRates(false);
    }
  }

  async function handleResetDay() {
    if (!driverId) return;
    setResetting(true);
    try {
      const count = await resetDriverDay(driverId, today());
      toast.success(`Settled ${count} transaction${count === 1 ? "" : "s"} for today.`);
      setConfirmResetOpen(false);
      handleCompute();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset day.");
    } finally {
      setResetting(false);
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

      <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <span className="text-sm font-medium text-[var(--color-ink-muted)]">
          Pay rates
        </span>
        <div className="flex gap-3">
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium text-[var(--color-ink-muted)]">
              Salary / day
            </span>
            <Input
              type="number"
              min={0}
              inputMode="decimal"
              value={dailySalary}
              onChange={(e) => setDailySalary(Number(e.target.value))}
            />
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium text-[var(--color-ink-muted)]">
              Rate / gallon
            </span>
            <Input
              type="number"
              min={0}
              inputMode="decimal"
              value={ratePerGallon}
              onChange={(e) => setRatePerGallon(Number(e.target.value))}
            />
          </label>
        </div>
        <Button
          variant="secondary"
          onClick={handleSaveRates}
          disabled={savingRates}
          className="w-full"
        >
          {savingRates ? "Saving…" : "Save rates"}
        </Button>
      </div>

      {loading && !result && (
        <p className="text-center text-sm text-[var(--color-ink-muted)]">
          Computing today&apos;s salary…
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-[var(--color-ink-muted)]">
              Gallons delivered today
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
              Base pay
            </span>
            <span className="font-display text-lg font-medium tabular-nums">
              ₱{result.baseSalary.toLocaleString()}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-[var(--color-ink-muted)]">
              Commission ({result.totalGallons.toLocaleString()} gal × ₱
              {result.ratePerGallon.toLocaleString()})
            </span>
            <span className="font-display text-lg font-medium tabular-nums">
              ₱{result.commission.toLocaleString()}
            </span>
          </div>
          <div className="h-px bg-[var(--color-border)]" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-[var(--color-ink-muted)]">
              Total salary
            </span>
            <span className="font-display text-2xl font-semibold tabular-nums text-[var(--color-deep-blue)]">
              ₱{result.totalSalary.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {result && result.customerBreakdown.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <span className="text-sm font-medium text-[var(--color-ink-muted)]">
            Customers today
          </span>
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {result.customerBreakdown.map((c) => (
              <div
                key={c.customerId}
                className="flex items-center justify-between py-2.5"
              >
                <span className="text-[var(--color-ink)]">{c.customerName}</span>
                <span className="font-display font-medium tabular-nums text-[var(--color-ink)]">
                  {c.gallons.toLocaleString()} gal
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <Button
          variant="secondary"
          onClick={() => setConfirmResetOpen(true)}
          disabled={resetting || result.transactionCount === 0}
          className="w-full text-[var(--color-danger)]"
        >
          {resetting ? "Resetting…" : "Reset today's transactions"}
        </Button>
      )}

      <ConfirmDialog
        open={confirmResetOpen}
        title="Reset today's transactions?"
        description={`This settles today's deliveries for ${driver?.name ?? "this driver"} so they stop counting toward today's salary. Delivery history is kept — nothing is deleted.`}
        confirmLabel="Reset"
        destructive
        loading={resetting}
        onConfirm={handleResetDay}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
}
