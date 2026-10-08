import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { getAllCustomers } from "@/lib/actions/customers";
import { getDrivers } from "@/lib/actions/drivers";
import { CustomersList } from "@/components/customers-list";
import { PageHeader } from "@/components/page-header";

export default async function CustomersPage() {
  const [customers, drivers] = await Promise.all([getAllCustomers(), getDrivers()]);

  return (
    <div className="page">
      <PageHeader
        title="Customers"
        sub={`${customers.length} on record`}
        action={
          <Link
            href="/customers/new"
            className="press flex h-11 shrink-0 items-center gap-1.5 rounded-pill bg-deep-blue px-4 font-display font-semibold text-white"
          >
            <Plus size={16} weight="bold" />
            New
          </Link>
        }
      />
      <CustomersList customers={customers} drivers={drivers} />
    </div>
  );
}
