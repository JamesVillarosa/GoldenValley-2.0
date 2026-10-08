import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/actions/customers";
import { getDrivers } from "@/lib/actions/drivers";
import { getPrice } from "@/lib/actions/reports";
import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/page-header";

export default async function EditCustomerPage({ params }: PageProps<"/customers/[id]/edit">) {
  const { id } = await params;
  const [customer, drivers, price] = await Promise.all([getCustomer(id), getDrivers(), getPrice()]);
  if (!customer) notFound();

  return (
    <div className="page">
      <PageHeader title="Edit customer" />
      <CustomerForm customer={customer} drivers={drivers} stationPrice={price} />
    </div>
  );
}
