import { format, formatDistanceToNowStrict } from "date-fns";
import { getDueCustomers } from "@/lib/actions/customers";
import { getDrivers } from "@/lib/actions/drivers";
import { DropletStatus } from "@/components/droplet-status";
import { PushOptIn } from "@/components/push-opt-in";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";

export default async function DashboardPage() {
  const [customers, drivers] = await Promise.all([getDueCustomers(), getDrivers()]);
  const driverName = new Map(drivers.map((d) => [d.id, d.name]));

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6">
      <header className="flex items-start justify-between gap-3 pb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
            Due for delivery
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {customers.length
              ? `${customers.length} customer${customers.length === 1 ? "" : "s"} to reach out to`
              : "Everyone is on schedule"}
          </p>
        </div>
        <PushOptIn />
      </header>

      {customers.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">
          <CheckCircle size={32} weight="light" color="var(--color-success)" />
          <p className="font-display text-lg font-medium">No customers due today</p>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Check back tomorrow, or browse the full customer list to plan ahead.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {customers.map((customer) => (
            <li
              key={customer.id}
              className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <DropletStatus status={customer.status} size={20} />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-[var(--color-ink)]">
                  {customer.name}
                </p>
                <p className="truncate text-sm text-[var(--color-ink-muted)]">
                  {driverName.get(customer.driver_id) ?? "Unassigned"}
                  {customer.last_transaction_at
                    ? ` · last delivered ${format(new Date(customer.last_transaction_at), "MMM d")}`
                    : ""}
                </p>
              </div>
              <span
                className="shrink-0 text-sm font-medium tabular-nums"
                style={{
                  color:
                    customer.status === "overdue"
                      ? "var(--color-danger)"
                      : "var(--color-warning)",
                }}
              >
                {customer.expected_next_date &&
                  formatDistanceToNowStrict(new Date(customer.expected_next_date), {
                    addSuffix: true,
                  })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
