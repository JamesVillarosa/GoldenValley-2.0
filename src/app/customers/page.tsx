import { getAllCustomers } from "@/lib/actions/customers";
import { getDrivers } from "@/lib/actions/drivers";
import { CustomersList } from "@/components/customers-list";

export default async function CustomersPage() {
  const [customers, drivers] = await Promise.all([
    getAllCustomers(""),
    getDrivers(),
  ]);

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-6">
      <header className="pb-4">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
          Customers
        </h1>
      </header>

      <CustomersList initialCustomers={customers} drivers={drivers} />
    </div>
  );
}
