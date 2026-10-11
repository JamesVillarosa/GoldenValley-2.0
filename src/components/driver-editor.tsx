"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { X } from "@phosphor-icons/react/dist/ssr";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveDriver, removeDriver } from "@/lib/actions/client";

interface EditableDriver {
  id: string;
  name: string;
  base_salary: number;
  rate_per_gallon: number;
  bonuses: { gallons: number; amount: number }[];
  role: "driver" | "washer";
}

/** Collapsed form to rename a driver and set their pay. Without a driver it
 * adds a new one. */
export function DriverEditor({
  driver,
  role = driver?.role ?? "driver",
  canRemove = false,
}: {
  driver?: EditableDriver;
  /** What "add" creates when there is no driver to edit. */
  role?: "driver" | "washer";
  canRemove?: boolean;
}) {
  const washer = role === "washer";
  const details = useRef<HTMLDetailsElement>(null);
  const [name, setName] = useState(driver?.name ?? "");
  const [base, setBase] = useState(String(driver?.base_salary ?? ""));
  const [rate, setRate] = useState(String(driver?.rate_per_gallon ?? ""));
  const [bonuses, setBonuses] = useState(
    (driver?.bonuses ?? []).map((b) => ({ gallons: String(b.gallons), amount: String(b.amount) }))
  );
  const setBonus = (i: number, change: { gallons?: string; amount?: string }) =>
    setBonuses((list) => list.map((b, at) => (at === i ? { ...b, ...change } : b)));
  // A washer is usually paid a plain daily amount: the per-gallon and bonus
  // boxes stay hidden behind a plus button until they are wanted.
  const [more, setMore] = useState(!washer || Number(driver?.rate_per_gallon) > 0 || (driver?.bonuses.length ?? 0) > 0);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const id = driver?.id ?? `new-${role}`;

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
        setBonuses([]);
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
        {driver ? "Edit name, pay and bonus" : washer ? "Add a washer" : "Add a driver"}
      </summary>
      <form
        className="flex flex-col gap-3 px-4 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () =>
              saveDriver({
                id: driver?.id,
                name,
                baseSalary: Number(base || 0),
                ratePerGallon: more ? Number(rate || 0) : 0,
                bonuses: more ? bonuses.map((b) => ({ gallons: Number(b.gallons), amount: Number(b.amount) })) : [],
                role,
              }),
            driver ? "Saved" : washer ? "Washer added" : "Driver added"
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
              {washer ? "Pay per day (₱)" : "Base salary per day (₱)"}
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
          {more && (
          <div className="flex-1">
            <label htmlFor={`rate-${id}`} className="field-label">
              {washer ? "Per gallon the station sells (₱)" : "Commission per gallon (₱)"}
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
          )}
        </div>
        {!more && (
          <Button variant="ghost" onClick={() => setMore(true)} className="self-start px-0 text-deep-blue">
            + Add pay per gallon or a bonus
          </Button>
        )}
        {more && (
        <fieldset className="flex flex-col gap-2">
          <legend className="field-label">Bonus for a big day</legend>
          {bonuses.map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-[0.9375rem] text-ink-muted">
              <Input
                aria-label={`Bonus ${i + 1}: gallons in a day`}
                required
                type="number"
                min={1}
                step="any"
                inputMode="decimal"
                value={b.gallons}
                onChange={(e) => setBonus(i, { gallons: e.target.value })}
                className="min-w-0 flex-1 px-2 text-center"
              />
              <span className="shrink-0">gallons = +₱</span>
              <Input
                aria-label={`Bonus ${i + 1}: extra pesos`}
                required
                type="number"
                min={1}
                step="any"
                inputMode="decimal"
                value={b.amount}
                onChange={(e) => setBonus(i, { amount: e.target.value })}
                className="min-w-0 flex-1 px-2 text-center"
              />
              <button
                type="button"
                aria-label={`Remove bonus ${i + 1}`}
                onClick={() => setBonuses((list) => list.filter((_, at) => at !== i))}
                className="press grid h-11 w-11 shrink-0 place-items-center rounded-pill text-ink-muted"
              >
                <X size={18} />
              </button>
            </div>
          ))}
          <p className="text-sm text-ink-muted">
            Each target reached in one day adds its bonus. Example: 65 gallons = +₱25 and 100 gallons = +₱25 pays ₱50 on a
            100-gallon day.
          </p>
          <Button
            variant="ghost"
            onClick={() => setBonuses((list) => [...list, { gallons: "", amount: "" }])}
            className="self-start px-0 text-deep-blue"
          >
            + Add a bonus
          </Button>
        </fieldset>
        )}
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
          description={
            washer
              ? "They leave the salary list. Pay anything still owed first."
              : "They leave the driver list but their past deliveries are kept. Move their customers to another driver from the Customers tab."
          }
          danger
        confirmLabel="Remove"
          loading={busy}
          onConfirm={() => run(() => removeDriver(driver.id), "Removed")}
          onCancel={() => setConfirming(false)}
        />
      )}
    </details>
  );
}
