"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Drop, Trash } from "@phosphor-icons/react/dist/ssr";
import { Segmented } from "@/components/segmented";
import { CustomerSearch } from "@/components/customer-search";
import { GallonStepper } from "@/components/gallon-stepper";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  saveTransaction,
  deleteTransaction,
  getDriverDeliveries,
  type DriverDelivery,
} from "@/lib/actions/transactions";
import { gal, peso } from "@/lib/format";
import type { Driver, Customer } from "@/lib/supabase/types";

const DEFAULT_GALLONS = 5;

export function DeliverForm({
  drivers,
  price,
  today,
  initialCustomer,
}: {
  drivers: Driver[];
  price: number;
  today: string;
  initialCustomer: Customer | null;
}) {
  const [driverId, setDriverId] = useState(initialCustomer?.driver_id ?? drivers[0]?.id ?? "");
  const [customer, setCustomer] = useState(initialCustomer);
  const [gallons, setGallons] = useState(initialCustomer?.usual_gallons ?? DEFAULT_GALLONS);
  const [paid, setPaid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deliveries, setDeliveries] = useState<DriverDelivery[] | null>(null);
  const [toDelete, setToDelete] = useState<DriverDelivery | null>(null);

  useEffect(() => {
    if (!driverId) return;
    let cancelled = false;
    getDriverDeliveries(driverId, today)
      .then((data) => !cancelled && setDeliveries(data))
      .catch(() => !cancelled && setDeliveries([]));
    return () => {
      cancelled = true;
    };
  }, [driverId, today]);

  function pickCustomer(next: Customer | null) {
    setCustomer(next);
    setGallons(next?.usual_gallons ?? DEFAULT_GALLONS);
  }

  async function handleSave() {
    if (!customer) return;
    setSaving(true);
    try {
      const tx = await saveTransaction({ customerId: customer.id, driverId, gallons, paid });
      setDeliveries((prev) => [{ ...tx, customerName: customer.name }, ...(prev ?? [])]);
      toast.success(`${gal(gallons)} saved for ${customer.name}`);
      pickCustomer(null);
      setPaid(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save. Check your signal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    const tx = toDelete;
    setToDelete(null);
    const previous = deliveries;
    setDeliveries((prev) => prev?.filter((d) => d.id !== tx.id) ?? null);
    try {
      await deleteTransaction(tx.id);
      toast("Delivery removed");
    } catch (error) {
      setDeliveries(previous);
      toast.error(error instanceof Error ? error.message : "Could not remove.");
    }
  }

  if (!drivers.length) {
    return <p className="text-ink-muted">Add a driver on the Salary tab to start logging.</p>;
  }

  const total = deliveries?.reduce((sum, d) => sum + Number(d.gallons), 0) ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6 pb-24">
      <div className="flex flex-col gap-3">
        <Segmented
          label="Driver"
          options={drivers.map((d) => ({ value: d.id, label: d.name }))}
          value={driverId}
          onChange={(id) => {
            setDriverId(id);
            setDeliveries(null);
            pickCustomer(null);
          }}
        />

        <CustomerSearch driverId={driverId} selected={customer} onSelect={pickCustomer} />

        <div className="card flex items-center justify-between py-3 pr-3 pl-4">
          <span className="text-[0.9375rem] font-medium text-ink-muted">Gallons</span>
          <GallonStepper value={gallons} onChange={setGallons} />
        </div>

        {price > 0 && (
          <Segmented
            label="Payment"
            options={[
              { value: "paid", label: "Paid" },
              { value: "unpaid", label: "Unpaid (utang)" },
            ]}
            value={paid ? "paid" : "unpaid"}
            onChange={(v) => setPaid(v === "paid")}
          />
        )}
      </div>

      <section aria-labelledby="today-title">
        <div className="flex items-baseline justify-between pb-2">
          <h2 id="today-title" className="section-title">
            Today
          </h2>
          {deliveries && deliveries.length > 0 && (
            <p className="num text-[0.9375rem] font-medium text-ink-muted">
              {gal(total)} · {deliveries.length} {deliveries.length === 1 ? "stop" : "stops"}
            </p>
          )}
        </div>

        {deliveries === null ? (
          <div className="card h-[4.25rem] animate-pulse" aria-label="Loading deliveries" />
        ) : deliveries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center">
            <Drop size={28} weight="light" className="text-ink-muted" />
            <p className="text-[0.9375rem] text-ink-muted">
              Nothing logged for this driver today. Pick a customer above to log the first one.
            </p>
          </div>
        ) : (
          <ul className="card divide-y divide-border">
            {deliveries.map((tx) => (
              <li key={tx.id} className="row-in flex items-center gap-3 py-2 pr-1.5 pl-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{tx.customerName}</p>
                  <p className="text-sm text-ink-muted">
                    {format(new Date(tx.created_at), "h:mm a")}
                    {!tx.paid && <span className="font-medium text-danger-ink"> · unpaid</span>}
                  </p>
                </div>
                <span className="num font-semibold">{gal(tx.gallons)}</span>
                <button
                  type="button"
                  aria-label={`Remove delivery for ${tx.customerName}`}
                  onClick={() => setToDelete(tx)}
                  className="press grid h-11 w-11 shrink-0 place-items-center rounded-pill text-ink-muted"
                >
                  <Trash size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-[var(--nav-height)] z-20 mx-auto w-full max-w-md bg-gradient-to-t from-mist from-70% to-transparent px-4 pt-4 pb-3">
        <Button onClick={handleSave} disabled={saving || !customer} className="w-full min-w-0">
          <span className="truncate">
            {saving
              ? "Saving..."
              : customer
                ? `Save ${gal(gallons)}${price > 0 ? ` · ${peso(gallons * price)}` : ""}`
                : "Pick a customer"}
          </span>
        </Button>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Remove this delivery?"
        description={
          toDelete ? `${gal(toDelete.gallons)} for ${toDelete.customerName} will be deleted from today's log.` : ""
        }
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
