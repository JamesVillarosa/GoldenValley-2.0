import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getCustomer } from "@/lib/actions/customers";
import { getCustomerTransactions } from "@/lib/actions/transactions";
import { getDrivers } from "@/lib/actions/drivers";
import { DropletStatus } from "@/components/droplet-status";
import { IntervalOverrideForm } from "@/components/interval-override-form";
import { TransactionHistoryList } from "@/components/transaction-history-list";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [customer, transactions, drivers] = await Promise.all([
    getCustomer(id),
    getCustomerTransactions(id),
    getDrivers(),
  ]);

  if (!customer) notFound();

  const driver = drivers.find((d) => d.id === customer.driver_id);

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6 pb-6">
      <header className="flex items-center gap-3 pb-1">
        <DropletStatus status={customer.status} size={28} />
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
            {customer.name}
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {driver?.name ?? "Unassigned"}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs text-[var(--color-ink-muted)]">Interval</p>
          <p className="font-display text-lg font-semibold tabular-nums">
            {customer.computed_interval_days ?? "—"} days
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs text-[var(--color-ink-muted)]">Next expected</p>
          <p className="font-display text-lg font-semibold tabular-nums">
            {customer.expected_next_date
              ? format(new Date(customer.expected_next_date), "MMM d")
              : "—"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <IntervalOverrideForm
          customerId={customer.id}
          manualIntervalDays={customer.manual_interval_days}
        />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-[var(--color-ink)]">
          Delivery history
        </h2>
        <TransactionHistoryList customerId={customer.id} transactions={transactions} />
      </div>
    </div>
  );
}
