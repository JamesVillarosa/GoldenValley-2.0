import { getDrivers } from "@/lib/actions/drivers";
import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/page-header";

export default async function NewCustomerPage() {
  return (
    <div className="page">
      <PageHeader title="New customer" />
      <CustomerForm drivers={await getDrivers()} />
    </div>
  );
}
