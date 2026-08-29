"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { MagnifyingGlass, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { getAllCustomers } from "@/lib/actions/customers";
import { DropletStatus } from "@/components/droplet-status";
import { Input } from "@/components/ui/input";
import type { Customer, Driver } from "@/lib/supabase/types";

export function CustomersList({
  initialCustomers,
  drivers,
}: {
  initialCustomers: Customer[];
  drivers: Driver[];
}) {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState(initialCustomers);
  const [, startTransition] = useTransition();
  const driverName = new Map(drivers.map((d) => [d.id, d.name]));

  useEffect(() => {
    const handle = setTimeout(() => {
      startTransition(async () => {
        const data = await getAllCustomers(query);
        setCustomers(data);
      });
    }, 150);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <MagnifyingGlass
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all customers"
          className="pl-11"
        />
      </div>

      {customers.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--color-ink-muted)]">
          No customers match &quot;{query}&quot;.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 pb-6">
          {customers.map((customer) => (
            <li key={customer.id}>
              <Link
                href={`/customers/${customer.id}`}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
              >
                <DropletStatus status={customer.status} size={20} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--color-ink)]">
                    {customer.name}
                  </p>
                  <p className="truncate text-sm text-[var(--color-ink-muted)]">
                    {driverName.get(customer.driver_id) ?? "Unassigned"}
                  </p>
                </div>
                <CaretRight size={16} color="var(--color-ink-muted)" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
