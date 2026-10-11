"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteCustomer, saveCustomer } from "@/lib/actions/customers";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { GallonStepper } from "@/components/gallon-stepper";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Customer, Driver } from "@/lib/supabase/types";

export function CustomerForm({
  customer,
  drivers,
  stationPrice,
  areas,
}: {
  /** Places already used by other customers, offered as suggestions. */
  areas: string[];
  customer?: Customer;
  drivers: Driver[];
  stationPrice: number;
}) {
  const router = useRouter();
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [driverId, setDriverId] = useState(customer?.driver_id ?? drivers[0]?.id ?? "");
  const [containers, setContainers] = useState(customer?.containers_out ?? 0);
  const [area, setArea] = useState(customer?.area ?? "");
  // The price is typed the way it was agreed: "50 pesos for 3 gallons".
  const [price, setPrice] = useState(
    customer?.price_per_gallon != null
      ? String(Math.round(customer.price_per_gallon * customer.price_qty * 100) / 100)
      : ""
  );
  const [qty, setQty] = useState(String(customer?.price_qty ?? 1));
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
        pricePerGallon: price.trim() ? Number(price) / (Number(qty) || 1) : null,
        priceQty: Number(qty) || 1,
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
              <button
                key={a}
                type="button"
                aria-pressed={a === area}
                onClick={() => setArea(a)}
                className={`press h-9 rounded-pill border px-3 text-sm font-medium ${
                  a === area ? "border-deep-blue bg-deep-blue text-white" : "border-border bg-surface text-deep-blue"
                }`}
              >
                {a}
              </button>
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
      <div>
        <span className="field-label">Price</span>
        <div className="flex items-center gap-2">
          <span className="text-ink-muted">₱</span>
          <Input
            id="price"
            aria-label="Price in pesos"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            placeholder={String(stationPrice)}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-describedby="price-help"
            className="min-w-0 flex-1"
          />
          <span className="shrink-0 text-ink-muted">for</span>
          <Input
            aria-label="Number of gallons for that price"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={qty}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setQty(e.target.value)}
            className="w-20 text-center"
          />
          <span className="shrink-0 text-ink-muted">gal</span>
        </div>
        <p id="price-help" className="mt-1.5 text-sm text-ink-muted">
          Leave the price blank to charge the station price. For a deal like 3 gallons for ₱50, type 50 for 3.
        </p>
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
