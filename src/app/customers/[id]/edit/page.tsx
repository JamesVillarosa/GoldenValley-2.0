import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/actions/customers";
import { getDrivers } from "@/lib/actions/drivers";
import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/page-header";

export default async function EditCustomerPage({ params }: PageProps<"/customers/[id]/edit">) {
  const { id } = await params;
  const [customer, drivers] = await Promise.all([getCustomer(id), getDrivers()]);
  if (!customer) notFound();

  return (
    <div className="page">
      <PageHeader title="Edit customer" />
      <CustomerForm customer={customer} drivers={drivers} />
    </div>
  );
}
