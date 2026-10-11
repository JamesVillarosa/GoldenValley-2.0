"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Drop } from "@phosphor-icons/react/dist/ssr";
import { Segmented } from "@/components/segmented";
import { CustomerSearch } from "@/components/customer-search";
import { GallonStepper } from "@/components/gallon-stepper";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DayTotal, DeliveryList } from "@/components/delivery-list";
import { Button } from "@/components/ui/button";
import { saveTransaction, getDriverDeliveries, type DriverDelivery } from "@/lib/actions/transactions";
import { isClosed, manilaToday } from "@/lib/dates";
import { gal, peso } from "@/lib/format";
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
  const [reminding, setReminding] = useState(false);

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

  function pickCustomer(next: Customer | null) {
    setCustomer(next);
    setGallons(next?.usual_gallons ?? DEFAULT_GALLONS);
  }

  // A customer who still owes money gets a reminder before the new sale is added.
  function handleSave() {
    if (!walkIn && !customer) return;
    if (customer && customer.balance > 0) setReminding(true);
    else save();
  }

  async function save() {
    setReminding(false);
    setSaving(true);
    const name = customer?.name ?? "walk-in";
    try {
      const tx = await saveTransaction({
        customerId: customer?.id ?? null,
        driverId: walkIn ? null : driverId,
        gallons,
        date,
      });
      setDeliveries((prev) => [{ ...tx, customerName: customer?.name ?? "Walk-in", driverName: null }, ...(prev ?? [])]);
      toast.success(`${gal(gallons)} saved for ${name}`);
      pickCustomer(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save. Check your signal.");
    } finally {
      setSaving(false);
    }
  }

  // On a Sunday the form logs for Saturday, which is not "today".
  const dayLabel = date === manilaToday() ? "Today" : format(parseISO(date), "EEE, MMM d");

  return (
    <div className="flex flex-1 flex-col gap-6 pb-24">
      <div className="flex flex-col gap-3">
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
              const next = e.target.value || today;
              if (isClosed(next)) return void toast.error("The station is closed on Sundays.");
              setDate(next);
              setDeliveries(null);
            }}
            className="num h-11 bg-transparent text-right font-medium text-ink outline-none"
          />
        </label>

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
      </div>

      <section aria-labelledby="day-title">
        <div className="flex items-end justify-between pb-2">
          <h2 id="day-title" className="section-title">
            {dayLabel}
          </h2>
          {deliveries && deliveries.length > 0 && <DayTotal rows={deliveries} />}
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
          <DeliveryList rows={deliveries} setRows={setDeliveries} />
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
        open={reminding}
        title={`${customer?.name} still owes ${peso(customer?.balance ?? 0)}`}
        description="Remind them about the unpaid balance. This delivery will be added on top of it."
        confirmLabel="Save delivery"
        onConfirm={save}
        onCancel={() => setReminding(false)}
      />
    </div>
  );
}
