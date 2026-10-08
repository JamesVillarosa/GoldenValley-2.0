import { getDrivers } from "@/lib/actions/drivers";
import { getPrice } from "@/lib/actions/reports";
import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/page-header";

export default async function NewCustomerPage() {
  const [drivers, price] = await Promise.all([getDrivers(), getPrice()]);
  return (
    <div className="page">
      <PageHeader title="New customer" />
      <CustomerForm drivers={drivers} stationPrice={price} />
    </div>
  );
}
