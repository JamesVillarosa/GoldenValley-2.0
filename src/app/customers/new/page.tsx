import { getAreas } from "@/lib/actions/customers";
import { getDrivers } from "@/lib/actions/drivers";
import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/page-header";

export default async function NewCustomerPage() {
  const [drivers, areas] = await Promise.all([getDrivers(), getAreas()]);
  return (
    <div className="page">
      <PageHeader title="New customer" />
      <CustomerForm drivers={drivers} areas={areas} />
    </div>
  );
}
