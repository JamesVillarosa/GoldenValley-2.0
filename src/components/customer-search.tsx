"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MagnifyingGlass, Plus, X } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { searchCustomers, saveCustomer } from "@/lib/actions/customers";
import type { Customer } from "@/lib/supabase/types";
import { DropletStatus } from "@/components/droplet-status";
import { Input } from "@/components/ui/input";

export function CustomerSearch({
  driverId,
  selected,
  onSelect,
}: {
  driverId: string;
  selected: Customer | null;
  onSelect: (customer: Customer | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      startTransition(async () => {
        try {
          setResults(await searchCustomers(driverId, query));
        } catch {
          setResults([]);
        }
      });
    }, 150);
    return () => clearTimeout(handle);
  }, [query, driverId, open]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function pick(customer: Customer) {
    onSelect(customer);
    setQuery("");
    setOpen(false);
  }

  function handleCreate() {
    startTransition(async () => {
      try {
        pick(await saveCustomer({ name: query, driverId }));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add customer.");
      }
    });
  }

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border bg-mist py-2 pr-1.5 pl-4">
        <DropletStatus status={selected.status} size={20} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[1.0625rem] font-medium">{selected.name}</p>
          {selected.address && <p className="truncate text-sm text-ink-muted">{selected.address}</p>}
        </div>
        <button
          type="button"
          aria-label="Change customer"
          onClick={() => onSelect(null)}
          className="press grid h-11 w-11 shrink-0 place-items-center rounded-pill text-ink-muted"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  const name = query.trim();
  const exactMatch = results.some((r) => r.name.toLowerCase() === name.toLowerCase());

  return (
    <div ref={containerRef} className="relative">
      <MagnifyingGlass
        size={18}
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-muted"
      />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search customer"
        aria-label="Search customer"
        className="pl-11"
      />

      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-y-auto rounded-md border border-border bg-surface shadow-sheet">
          {results.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => pick(customer)}
              className="flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-mist"
            >
              <DropletStatus status={customer.status} size={16} />
              <span className="min-w-0 flex-1 truncate font-medium">{customer.name}</span>
              {customer.usual_gallons != null && (
                <span className="num shrink-0 text-sm text-ink-muted">{customer.usual_gallons} gal</span>
              )}
            </button>
          ))}

          {!isPending && name && !exactMatch && (
            <button
              type="button"
              onClick={handleCreate}
              className="flex min-h-12 w-full items-center gap-3 border-t border-border px-4 py-2.5 text-left font-medium text-deep-blue"
            >
              <Plus size={16} weight="bold" />
              Add &quot;{name}&quot; as new customer
            </button>
          )}

          {!isPending && results.length === 0 && !name && (
            <p className="px-4 py-3 text-sm text-ink-muted">
              No customers for this driver yet. Type a name to add one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
