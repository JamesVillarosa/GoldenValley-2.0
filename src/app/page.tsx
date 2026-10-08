import Link from "next/link";
import { format, parseISO } from "date-fns";
import { GearSix } from "@phosphor-icons/react/dist/ssr";
import { getCustomer } from "@/lib/actions/customers";
import { getDrivers } from "@/lib/actions/drivers";
import { getPrice } from "@/lib/actions/reports";
import { manilaToday } from "@/lib/dates";
import { DeliverForm } from "@/components/deliver-form";
import { PageHeader } from "@/components/page-header";

export default async function DeliverPage({ searchParams }: PageProps<"/">) {
  const { customer: customerId } = await searchParams;
  const [drivers, price, customer] = await Promise.all([
    getDrivers(),
    getPrice(),
    typeof customerId === "string" ? getCustomer(customerId) : null,
  ]);
  const today = manilaToday();

  return (
    <div className="page flex flex-1 flex-col">
      <PageHeader
        title="Deliver"
        sub={format(parseISO(today), "EEEE, MMMM d")}
        action={
          <Link
            href="/settings"
            aria-label="Settings"
            className="press grid h-11 w-11 shrink-0 place-items-center rounded-pill border border-border bg-surface text-deep-blue"
          >
            <GearSix size={20} />
          </Link>
        }
      />
      <DeliverForm key={today} drivers={drivers} price={price} today={today} initialCustomer={customer} />
    </div>
  );
}
