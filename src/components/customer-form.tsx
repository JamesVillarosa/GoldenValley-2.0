"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveCustomer } from "@/lib/actions/customers";
import { GallonStepper } from "@/components/gallon-stepper";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Customer, Driver } from "@/lib/supabase/types";

export function CustomerForm({ customer, drivers }: { customer?: Customer; drivers: Driver[] }) {
  const router = useRouter();
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [driverId, setDriverId] = useState(customer?.driver_id ?? drivers[0]?.id ?? "");
  const [containers, setContainers] = useState(customer?.containers_out ?? 0);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const saved = await saveCustomer({ id: customer?.id, name, phone, address, driverId, containersOut: containers });
      toast.success(customer ? "Customer saved" : "Customer added");
      router.replace(`/customers/${saved.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="name" className="field-label">
          Name
        </label>
        <Input id="name" required autoFocus={!customer} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label htmlFor="phone" className="field-label">
          Mobile number
        </label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="09XX XXX XXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="address" className="field-label">
          Address
        </label>
        <Input
          id="address"
          autoComplete="off"
          placeholder="Street, purok or landmark"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <div>
        <span className="field-label">Delivered by</span>
        <Segmented
          label="Delivered by"
          options={drivers.map((d) => ({ value: d.id, label: d.name }))}
          value={driverId}
          onChange={setDriverId}
        />
      </div>
      <div className="card flex items-center justify-between py-3 pr-3 pl-4">
        <div>
          <p className="text-[0.9375rem] font-medium">Containers lent</p>
          <p className="text-sm text-ink-muted">Your gallons at their place</p>
        </div>
        <GallonStepper value={containers} onChange={setContainers} label="Containers lent" min={0} />
      </div>

      <Button type="submit" disabled={busy} className="mt-2 w-full">
        {busy ? "Saving..." : customer ? "Save changes" : "Add customer"}
      </Button>
      <Button variant="ghost" onClick={() => router.back()} className="w-full">
        Cancel
      </Button>
    </form>
  );
}
