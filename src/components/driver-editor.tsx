"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { saveDriver, removeDriver } from "@/lib/actions/drivers";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EditableDriver {
  id: string;
  name: string;
  base_salary: number;
  rate_per_gallon: number;
}

/** Collapsed form to rename a driver and set their pay. Without a driver it
 * adds a new one. */
export function DriverEditor({ driver, canRemove = false }: { driver?: EditableDriver; canRemove?: boolean }) {
  const details = useRef<HTMLDetailsElement>(null);
  const [name, setName] = useState(driver?.name ?? "");
  const [base, setBase] = useState(String(driver?.base_salary ?? ""));
  const [rate, setRate] = useState(String(driver?.rate_per_gallon ?? ""));
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const id = driver?.id ?? "new";

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    try {
      await action();
      toast.success(done);
      if (details.current) details.current.open = false;
      if (!driver) {
        setName("");
        setBase("");
        setRate("");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <details ref={details} className={driver ? "border-t border-border" : undefined}>
      <summary className="flex min-h-12 cursor-pointer items-center px-4 font-medium text-deep-blue">
        {driver ? "Edit name and pay" : "Add a driver"}
      </summary>
      <form
        className="flex flex-col gap-3 px-4 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => saveDriver({ id: driver?.id, name, baseSalary: Number(base || 0), ratePerGallon: Number(rate || 0) }),
            driver ? "Driver saved" : "Driver added"
          );
        }}
      >
        <div>
          <label htmlFor={`name-${id}`} className="field-label">
            Name
          </label>
          <Input id={`name-${id}`} required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor={`base-${id}`} className="field-label">
              Base salary per day (₱)
            </label>
            <Input
              id={`base-${id}`}
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={base}
              onChange={(e) => setBase(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label htmlFor={`rate-${id}`} className="field-label">
              Commission per gallon (₱)
            </label>
            <Input
              id={`rate-${id}`}
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-3">
          {driver && canRemove && (
            <Button variant="ghost" onClick={() => setConfirming(true)} disabled={busy} className="text-danger-ink">
              Remove
            </Button>
          )}
          <Button type="submit" variant="secondary" disabled={busy} className="flex-1">
            {busy ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>

      {driver && (
        <ConfirmDialog
          open={confirming}
          title={`Remove ${driver.name}?`}
          description="They leave the driver list but their past deliveries are kept. Move their customers to another driver from the Customers tab."
          confirmLabel="Remove"
          loading={busy}
          onConfirm={() => run(() => removeDriver(driver.id), "Driver removed")}
          onCancel={() => setConfirming(false)}
        />
      )}
    </details>
  );
}
