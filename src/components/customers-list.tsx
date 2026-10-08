"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { DropletStatus } from "@/components/droplet-status";
import { Segmented } from "@/components/segmented";
import { Input } from "@/components/ui/input";
import { peso } from "@/lib/format";
import type { Customer, Driver } from "@/lib/supabase/types";

type Filter = "all" | "owing" | "containers";

export function CustomersList({ customers, drivers }: { customers: Customer[]; drivers: Driver[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const needle = useDeferredValue(query).trim().toLowerCase();
  const driverName = new Map(drivers.map((d) => [d.id, d.name]));

  // All customers are already on the phone, so filtering is instant and works offline.
  const shown = customers.filter(
    (c) =>
      (filter === "all" || (filter === "owing" ? c.balance > 0 : c.containers_out > 0)) &&
      (!needle ||
        c.name.toLowerCase().includes(needle) ||
        c.address?.toLowerCase().includes(needle) ||
        c.phone?.includes(needle))
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <MagnifyingGlass
          size={18}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-muted"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, address or number"
          aria-label="Search customers"
          className="pl-11"
        />
      </div>
      <Segmented
        label="Filter"
        options={[
          { value: "all", label: "All" },
          { value: "owing", label: "Unpaid" },
          { value: "containers", label: "Has containers" },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-[0.9375rem] text-ink-muted">
          {customers.length === 0
            ? "No customers yet. Tap New to add your first one."
            : "No customers match. Try a shorter search or the All filter."}
        </p>
      ) : (
        <ul className="card mt-1 divide-y divide-border overflow-hidden">
          {shown.map((customer) => (
            <li key={customer.id} className="[contain-intrinsic-size:auto_4rem] [content-visibility:auto]">
              <Link href={`/customers/${customer.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-mist">
                <DropletStatus status={customer.status} size={20} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{customer.name}</p>
                  <p className="truncate text-sm text-ink-muted">
                    {[customer.address, driverName.get(customer.driver_id)].filter(Boolean).join(" · ") ||
                      "No driver"}
                  </p>
                </div>
                {customer.balance > 0 && (
                  <span className="num shrink-0 font-semibold text-danger-ink">{peso(customer.balance)}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
