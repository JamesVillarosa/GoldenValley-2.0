"use client";

import { useState } from "react";
import Link from "next/link";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { CheckCircle, Phone } from "@phosphor-icons/react/dist/ssr";
import { DropletStatus } from "@/components/droplet-status";
import { PageHeader } from "@/components/page-header";
import { Segmented } from "@/components/segmented";
import { gal } from "@/lib/format";
import type { Customer, Driver } from "@/lib/supabase/types";

const sumGallons = (rows: Customer[]) => rows.reduce((sum, c) => sum + Number(c.usual_gallons ?? 0), 0);

function Row({ customer, today }: { customer: Customer; today: string }) {
  const late = differenceInCalendarDays(parseISO(today), parseISO(customer.expected_next_date!));
  return (
    <li className="flex items-center gap-1 pr-1.5">
      {/* The row itself is the main action: log this customer's delivery. */}
      <Link href={`/?customer=${customer.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 active:bg-mist">
        <DropletStatus status={customer.status} size={20} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{customer.name}</p>
          <p className="truncate text-sm text-ink-muted">
            {late > 0 && <span className="font-medium text-danger-ink">{late}d late · </span>}
            {customer.address || `every ${customer.computed_interval_days} days`}
          </p>
        </div>
        {customer.usual_gallons != null && (
          <span className="num shrink-0 font-semibold">{gal(customer.usual_gallons)}</span>
        )}
      </Link>
      {customer.phone && (
        <a
          href={`tel:${customer.phone}`}
          aria-label={`Call ${customer.name}`}
          className="press grid h-11 w-11 shrink-0 place-items-center rounded-pill text-deep-blue"
        >
          <Phone size={20} />
        </a>
      )}
    </li>
  );
}

function Group({ title, rows, today }: { title: string; rows: Customer[]; today: string }) {
  if (!rows.length) return null;
  return (
    <section>
      <div className="flex items-baseline justify-between pb-2">
        <h2 className="section-title">{title}</h2>
        <p className="num text-[0.9375rem] font-medium text-ink-muted">
          {rows.length} · about {gal(sumGallons(rows))}
        </p>
      </div>
      <ul className="card divide-y divide-border overflow-hidden">
        {rows.map((c) => (
          <Row key={c.id} customer={c} today={today} />
        ))}
      </ul>
    </section>
  );
}

export function DueList({
  due,
  lapsed,
  drivers,
  today,
}: {
  due: Customer[];
  lapsed: Customer[];
  drivers: Driver[];
  today: string;
}) {
  const [driverId, setDriverId] = useState("all");
  const mine = (rows: Customer[]) => (driverId === "all" ? rows : rows.filter((c) => c.driver_id === driverId));

  const rows = mine(due);
  const overdue = rows.filter((c) => c.expected_next_date! < today);
  const todays = rows.filter((c) => c.expected_next_date === today);
  const tomorrow = rows.filter((c) => c.expected_next_date! > today);
  const toLoad = [...overdue, ...todays];
  const old = mine(lapsed);

  return (
    <div className="page flex flex-col gap-6">
      <div>
        <PageHeader
          title="Due"
          sub={
            toLoad.length
              ? `${toLoad.length} ${toLoad.length === 1 ? "customer" : "customers"} expected, about ${gal(sumGallons(toLoad))} to load`
              : "Nobody is expected to order today"
          }
        />
        <Segmented
          label="Driver"
          options={[{ value: "all", label: "All" }, ...drivers.map((d) => ({ value: d.id, label: d.name }))]}
          value={driverId}
          onChange={setDriverId}
        />
      </div>

      {rows.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <CheckCircle size={28} weight="light" className="text-success-ink" />
          <p className="text-[0.9375rem] text-ink-muted">
            All caught up. Customers appear here on the day their usual order is due, learned from their past deliveries.
          </p>
        </div>
      )}

      <Group title="Overdue" rows={overdue} today={today} />
      <Group title="Today" rows={todays} today={today} />
      <Group title="Tomorrow" rows={tomorrow} today={today} />

      {old.length > 0 && (
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center font-medium text-deep-blue">
            {old.length} not ordered in over 2 weeks
          </summary>
          <ul className="card mt-2 divide-y divide-border overflow-hidden">
            {old.map((c) => (
              <Row key={c.id} customer={c} today={today} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
