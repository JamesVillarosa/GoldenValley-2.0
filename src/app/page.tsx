import { getDrivers } from "@/lib/actions/drivers";
import { TransactionForm } from "@/components/transaction-form";

export default async function TransactionPage() {
  const drivers = await getDrivers();

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4">
      <header className="pt-6 pb-4">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
          New delivery
        </h1>
      </header>

      <TransactionForm drivers={drivers} />
    </div>
  );
}
