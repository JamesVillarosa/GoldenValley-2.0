"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
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
  setPaid,
  getDriverDeliveries,
  type DriverDelivery,
} from "@/lib/actions/transactions";
import { gal, peso } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Driver, Customer } from "@/lib/supabase/types";

const DEFAULT_GALLONS = 5;
const WALK_IN = "walk-in";

export function DeliverForm({
  drivers,
  price: stationPrice,
  today,
  initialCustomer,
}: {
  drivers: Driver[];
  price: number;
  today: string;
  initialCustomer: Customer | null;
}) {
  const [driverId, setDriverId] = useState(initialCustomer?.driver_id ?? drivers[0]?.id ?? WALK_IN);
  const [customer, setCustomer] = useState(initialCustomer);
  const [gallons, setGallons] = useState(initialCustomer?.usual_gallons ?? DEFAULT_GALLONS);
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [deliveries, setDeliveries] = useState<DriverDelivery[] | null>(null);
  const [toDelete, setToDelete] = useState<DriverDelivery | null>(null);

  const walkIn = driverId === WALK_IN;
  const price = customer?.price_per_gallon ?? stationPrice;
  const backdated = date !== today;

  useEffect(() => {
    let cancelled = false;
    getDriverDeliveries(walkIn ? null : driverId, date)
      .then((data) => !cancelled && setDeliveries(data))
      .catch(() => !cancelled && setDeliveries([]));
    return () => {
      cancelled = true;
    };
  }, [driverId, walkIn, date]);

  // Left open overnight, the screen must roll over to the new day by itself:
  // the page re-renders with the new date, which remounts this form.
  const router = useRouter();
  useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [router]);

  // Payment is recorded after the driver comes back, not while listing.
  async function togglePaid(tx: DriverDelivery) {
    const flip = (paid: boolean) =>
      setDeliveries((prev) => prev?.map((d) => (d.id === tx.id ? { ...d, paid } : d)) ?? null);
    flip(!tx.paid);
    try {
      await setPaid(tx.id, !tx.paid);
    } catch (error) {
      flip(tx.paid);
      toast.error(error instanceof Error ? error.message : "Could not save.");
    }
  }

  function pickCustomer(next: Customer | null) {
    setCustomer(next);
    setGallons(next?.usual_gallons ?? DEFAULT_GALLONS);
  }

  async function handleSave() {
    if (!walkIn && !customer) return;
    setSaving(true);
    const name = customer?.name ?? "walk-in";
    try {
      const tx = await saveTransaction({
        customerId: customer?.id ?? null,
        driverId: walkIn ? null : driverId,
        gallons,
        date,
      });
      setDeliveries((prev) => [{ ...tx, customerName: customer?.name ?? "Walk-in" }, ...(prev ?? [])]);
      toast.success(`${gal(gallons)} saved for ${name}`);
      pickCustomer(null);
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
      toast("Removed");
    } catch (error) {
      setDeliveries(previous);
      toast.error(error instanceof Error ? error.message : "Could not remove.");
    }
  }

  const total = deliveries?.reduce((sum, d) => sum + Number(d.gallons), 0) ?? 0;
  const owed = deliveries?.reduce((sum, d) => sum + (d.paid ? 0 : d.gallons * d.unit_price), 0) ?? 0;
  const dayLabel = backdated ? format(parseISO(date), "EEE, MMM d") : "Today";

  return (
    <div className="flex flex-1 flex-col gap-6 pb-24">
      <div className="flex flex-col gap-3">
        <Segmented
          label="Driver"
          options={[...drivers.map((d) => ({ value: d.id, label: d.name })), { value: WALK_IN, label: "Walk-in" }]}
          value={driverId}
          onChange={(id) => {
            setDriverId(id);
            setDeliveries(null);
            pickCustomer(null);
          }}
        />

        {walkIn ? (
          <p className="rounded-md border border-border bg-mist px-4 py-3 text-[0.9375rem] text-ink-muted">
            Sale at the station. No customer record and no driver commission.
          </p>
        ) : (
          <CustomerSearch driverId={driverId} selected={customer} onSelect={pickCustomer} />
        )}

        <div className="card flex items-center justify-between py-3 pr-3 pl-4">
          <span className="text-[0.9375rem] font-medium text-ink-muted">Gallons</span>
          <GallonStepper value={gallons} onChange={setGallons} />
        </div>

        <label
          className={`flex min-h-12 items-center justify-between gap-3 rounded-md border px-4 text-[0.9375rem] ${
            backdated ? "border-warning bg-warning/10 font-medium text-warning-ink" : "border-border text-ink-muted"
          }`}
        >
          {backdated ? "Logging a past day" : "Delivery date"}
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => {
              setDate(e.target.value || today);
              setDeliveries(null);
            }}
            className="num h-11 bg-transparent text-right font-medium text-ink outline-none"
          />
        </label>
      </div>

      <section aria-labelledby="day-title">
        <div className="flex items-baseline justify-between pb-2">
          <h2 id="day-title" className="section-title">
            {dayLabel}
          </h2>
          {deliveries && deliveries.length > 0 && (
            <p className="num text-[0.9375rem] font-medium text-ink-muted">
              {gal(total)} · {deliveries.length} {deliveries.length === 1 ? "sale" : "sales"}
              {owed > 0 && <span className="text-danger-ink"> · {peso(owed)} unpaid</span>}
            </p>
          )}
        </div>

        {deliveries === null ? (
          <div className="card h-[4.25rem] animate-pulse" aria-label="Loading" />
        ) : deliveries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center">
            <Drop size={28} weight="light" className="text-ink-muted" />
            <p className="text-[0.9375rem] text-ink-muted">
              {walkIn
                ? "No walk-in sales logged for this day."
                : "Nothing logged for this driver on this day. Pick a customer above to log the first one."}
            </p>
          </div>
        ) : (
          <ul className="card divide-y divide-border">
            {deliveries.map((tx) => (
              <li key={tx.id} className="row-in flex items-center gap-3 py-2 pr-1.5 pl-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{tx.customerName}</p>
                  <p className="num text-sm text-ink-muted">
                    <span className="font-semibold text-ink">{gal(tx.gallons)}</span>
                    {tx.unit_price > 0 && ` · ${peso(tx.gallons * tx.unit_price)}`}
                    {!backdated && ` · ${format(new Date(tx.created_at), "h:mm a")}`}
                  </p>
                </div>
                {tx.unit_price > 0 && (
                  <button
                    type="button"
                    aria-pressed={tx.paid}
                    aria-label={`${tx.customerName}: ${tx.paid ? "paid" : "unpaid"}. Tap to change`}
                    onClick={() => togglePaid(tx)}
                    className={cn(
                      "press h-10 w-[4.75rem] shrink-0 rounded-pill border text-sm font-semibold",
                      tx.paid ? "border-success-ink/30 bg-success/10 text-success-ink" : "border-danger-ink/30 bg-danger/10 text-danger-ink"
                    )}
                  >
                    {tx.paid ? "Paid" : "Unpaid"}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${tx.customerName}`}
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
        <Button onClick={handleSave} disabled={saving || (!walkIn && !customer)} className="w-full min-w-0">
          <span className="truncate">
            {saving
              ? "Saving..."
              : walkIn || customer
                ? `Save ${gal(gallons)}${price > 0 ? ` · ${peso(gallons * price)}` : ""}`
                : "Pick a customer"}
          </span>
        </Button>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Remove this sale?"
        description={toDelete ? `${gal(toDelete.gallons)} for ${toDelete.customerName} will be deleted from the log.` : ""}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
