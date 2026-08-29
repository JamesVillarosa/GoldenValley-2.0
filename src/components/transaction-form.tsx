"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DriverToggle } from "@/components/driver-toggle";
import { CustomerSearch } from "@/components/customer-search";
import { GallonStepper } from "@/components/gallon-stepper";
import { Button } from "@/components/ui/button";
import { saveTransaction, deleteTransaction } from "@/lib/actions/transactions";
import type { Driver, Customer } from "@/lib/supabase/types";

const DEFAULT_GALLONS = 5;

export function TransactionForm({ drivers }: { drivers: Driver[] }) {
  const [driverId, setDriverId] = useState(drivers[0]?.id ?? "");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [gallons, setGallons] = useState(DEFAULT_GALLONS);
  const [saving, setSaving] = useState(false);

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

      toast.success(`${savedGallons} gal saved for ${customerName}`, {
        action: {
          label: "Undo",
          onClick: () => {
            deleteTransaction(tx.id, tx.customer_id).then(() =>
              toast("Transaction removed")
            );
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
    <div className="flex flex-1 flex-col gap-6">
      <DriverToggle
        drivers={drivers}
        value={driverId}
        onChange={(id) => {
          setDriverId(id);
          setCustomer(null);
        }}
      />

      <CustomerSearch driverId={driverId} selected={customer} onSelect={setCustomer} />

      <div className="flex flex-1 items-center justify-center">
        <GallonStepper value={gallons} onChange={setGallons} />
      </div>

      <Button onClick={handleSave} disabled={saving} className="mb-6 w-full">
        {saving ? "Saving…" : "Save transaction"}
      </Button>
    </div>
  );
}
