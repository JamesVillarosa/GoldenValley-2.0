import { getAreas } from "@/lib/actions/customers";
import { getDrivers } from "@/lib/actions/drivers";
import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/page-header";

export default async function NewCustomerPage({ searchParams }: PageProps<"/customers/new">) {
  // name, driver and from=deliver arrive when the customer is added while logging a delivery.
  const { name, driver, from } = await searchParams;
  const [drivers, areas] = await Promise.all([getDrivers(), getAreas()]);
  return (
    <div className="page">
      <PageHeader title="New customer" />
      <CustomerForm
        drivers={drivers}
        areas={areas}
        initialName={typeof name === "string" ? name : ""}
        initialDriverId={drivers.find((d) => d.id === driver)?.id}
        backToDeliver={from === "deliver"}
      />
    </div>
  );
}
