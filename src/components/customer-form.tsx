"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PriceFields, draftOf, pricingInput } from "@/components/price-fields";
import { GallonStepper } from "@/components/gallon-stepper";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import type { Customer, Driver } from "@/lib/supabase/types";
import { deleteCustomer, saveCustomer } from "@/lib/actions/client";

export function CustomerForm({
  customer,
  drivers,
  areas,
}: {
  /** Places already used by other customers, offered as suggestions. */
  areas: string[];
  customer?: Customer;
  drivers: Driver[];
}) {
  const router = useRouter();
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [driverId, setDriverId] = useState(customer?.driver_id ?? drivers[0]?.id ?? "");
  const [containers, setContainers] = useState(customer?.containers_out ?? 0);
  const [area, setArea] = useState(customer?.area ?? "");
  const [pricing, setPricing] = useState(() => draftOf(customer));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const saved = await saveCustomer({
        id: customer?.id,
        name,
        phone,
        address,
        area,
        driverId,
        containersOut: containers,
        ...pricingInput(pricing),
      });
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
        <label htmlFor="area" className="field-label">
          Place (subdivision)
        </label>
        <Input
          id="area"
          autoComplete="off"
          list="area-list"
          placeholder="Mabuhay, Golden City, Labas..."
          value={area}
          onChange={(e) => setArea(e.target.value)}
        />
        <datalist id="area-list">
          {areas.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
        {areas.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {areas.map((a) => (
              <Chip key={a} label={a} active={a === area} onClick={() => setArea(a)} />
            ))}
          </div>
        )}
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
      <PriceFields value={pricing} onChange={setPricing} />
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

      {customer && (
        <>
          <Button variant="ghost" onClick={() => setConfirming(true)} disabled={busy} className="w-full text-danger-ink">
            Delete customer
          </Button>
          <ConfirmDialog
            open={confirming}
            title={`Delete ${customer.name}?`}
            description="They leave the customer list for good. Their past sales stay in History, Salary and the Dashboard."
            confirmLabel="Delete"
            danger
            loading={busy}
            onConfirm={async () => {
              setBusy(true);
              try {
                await deleteCustomer(customer.id);
                toast("Customer deleted");
                router.replace("/customers");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not delete.");
                setBusy(false);
                setConfirming(false);
              }
            }}
            onCancel={() => setConfirming(false)}
          />
        </>
      )}
    </form>
  );
}
