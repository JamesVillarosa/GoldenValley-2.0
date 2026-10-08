"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DriverToggle } from "@/components/driver-toggle";
import { CustomerSearch } from "@/components/customer-search";
import { GallonStepper } from "@/components/gallon-stepper";
import { TodayDeliveries } from "@/components/today-deliveries";
import { Button } from "@/components/ui/button";
import {
  saveTransaction,
  deleteTransaction,
  getDriverDeliveries,
  type DriverDelivery,
} from "@/lib/actions/transactions";
import type { Driver, Customer } from "@/lib/supabase/types";

const DEFAULT_GALLONS = 5;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionForm({ drivers }: { drivers: Driver[] }) {
  const [driverId, setDriverId] = useState(drivers[0]?.id ?? "");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [gallons, setGallons] = useState(DEFAULT_GALLONS);
  const [saving, setSaving] = useState(false);
  const [deliveries, setDeliveries] = useState<DriverDelivery[]>([]);

  useEffect(() => {
    if (!driverId) return;
    let cancelled = false;
    getDriverDeliveries(driverId, today())
      .then((data) => {
        if (!cancelled) setDeliveries(data);
      })
      .catch(() => {
        if (!cancelled) setDeliveries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [driverId]);

  async function handleSave() {
    if (!customer) {
      toast.error("Pick a customer first.");
      return;
    }

    setSaving(true);
    const customerName = customer.name;
    const savedGallons = gallons;

    try {
      const tx = await saveTransaction({
        customerId: customer.id,
        driverId,
        gallons,
      });

      setDeliveries((prev) => [{ ...tx, customerName }, ...prev]);

      toast.success(`${savedGallons} gal saved for ${customerName}`, {
        action: {
          label: "Undo",
          onClick: () => {
            deleteTransaction(tx.id, tx.customer_id).then(() => {
              setDeliveries((prev) => prev.filter((d) => d.id !== tx.id));
              toast("Transaction removed");
            });
          },
        },
      });

      setCustomer(null);
      setGallons(DEFAULT_GALLONS);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save transaction."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!drivers.length) {
    return (
      <p className="text-[var(--color-ink-muted)]">
        No drivers configured yet. Seed the drivers table to get started.
      </p>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3 pb-6">
        <DriverToggle
          drivers={drivers}
          value={driverId}
          onChange={(id) => {
            setDriverId(id);
            setCustomer(null);
          }}
        />

        <CustomerSearch driverId={driverId} selected={customer} onSelect={setCustomer} />

        <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3.5">
          <span className="text-sm font-medium text-[var(--color-ink-muted)]">
            Gallons
          </span>
          <GallonStepper value={gallons} onChange={setGallons} />
        </div>
      </div>

      <div className="flex-1 pb-[100px]">
        <TodayDeliveries
          deliveries={deliveries}
          onDeleted={(id) =>
            setDeliveries((prev) => prev.filter((d) => d.id !== id))
          }
        />
      </div>

      <div
        className="fixed inset-x-0 bottom-16 z-20 mx-auto w-full max-w-md border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
        style={{ boxShadow: "var(--shadow-sheet)" }}
      >
        <Button
          onClick={handleSave}
          disabled={saving || !customer}
          className="w-full min-w-0"
        >
          <span className="truncate">
            {saving
              ? "Saving…"
              : customer
                ? `Save ${gallons} gal for ${customer.name}`
                : "Select a customer"}
          </span>
        </Button>
      </div>
    </div>
  );
}
