"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MagnifyingGlass, Plus, X } from "@phosphor-icons/react/dist/ssr";
import { searchCustomers, createCustomer } from "@/lib/actions/customers";
import type { Customer } from "@/lib/supabase/types";
import { DropletStatus } from "@/components/droplet-status";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
          const data = await searchCustomers(driverId, query);
          setResults(data);
        } catch {
          setResults([]);
        }
      });
    }, 150);
    return () => clearTimeout(handle);
  }, [query, driverId, open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleCreate() {
    const name = query.trim();
    if (!name) return;
    startTransition(async () => {
      const customer = await createCustomer(driverId, name);
      onSelect(customer);
      setQuery("");
      setOpen(false);
    });
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex items-center gap-3">
          <DropletStatus status={selected.status} size={20} />
          <span className="font-display text-lg font-medium">{selected.name}</span>
        </div>
        <button
          type="button"
          aria-label="Change customer"
          onClick={() => onSelect(null)}
          className="grid h-9 w-9 place-items-center rounded-[var(--radius-pill)] text-[var(--color-ink-muted)] active:scale-[0.93] transition-transform duration-150"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  const exactMatch = results.some(
    (r) => r.name.toLowerCase() === query.trim().toLowerCase()
  );

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MagnifyingGlass
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search customer"
          className="pl-11"
        />
      </div>

      {open && (
        <div
          className="absolute inset-x-0 top-[calc(100%+8px)] z-20 max-h-72 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          style={{ boxShadow: "var(--shadow-sheet)" }}
        >
          {results.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => {
                onSelect(customer);
                setQuery("");
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                "hover:bg-[var(--color-mist)]"
              )}
            >
              <DropletStatus status={customer.status} size={16} />
              <span className="font-medium">{customer.name}</span>
            </button>
          ))}

          {!isPending && query.trim() && !exactMatch && (
            <button
              type="button"
              onClick={handleCreate}
              className="flex w-full items-center gap-3 border-t border-[var(--color-border)] px-4 py-3 text-left text-[var(--color-deep-blue)]"
            >
              <Plus size={16} weight="bold" />
              <span className="font-medium">Add &quot;{query.trim()}&quot;</span>
            </button>
          )}

          {!isPending && results.length === 0 && !query.trim() && (
            <div className="px-4 py-3 text-sm text-[var(--color-ink-muted)]">
              Start typing to search this driver&apos;s customers.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
