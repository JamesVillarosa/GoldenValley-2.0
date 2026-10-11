import Link from "next/link";
import { format, parseISO } from "date-fns";
import { GearSix, Receipt } from "@phosphor-icons/react/dist/ssr";
import { getCustomer } from "@/lib/actions/customers";
import { getDrivers } from "@/lib/actions/drivers";
import { getPrice } from "@/lib/actions/reports";
import { lastWorkday, manilaToday } from "@/lib/dates";
import { ExpenseButton } from "@/components/expense-button";
import { DeliverForm } from "@/components/deliver-form";
import { PageHeader } from "@/components/page-header";

export default async function DeliverPage({ searchParams }: PageProps<"/">) {
  const { customer: customerId } = await searchParams;
  const [drivers, price, customer] = await Promise.all([
    getDrivers(),
    getPrice(),
    typeof customerId === "string" ? getCustomer(customerId) : null,
  ]);
  const now = manilaToday();
  const today = lastWorkday(now);

  return (
    <div className="page flex flex-1 flex-col">
      <PageHeader
        title="Deliver"
        sub={now === today ? format(parseISO(today), "EEE, MMM d") : "Sunday: logging Saturday"}
        action={
          <div className="flex shrink-0 gap-2">
            <ExpenseButton
              today={today}
              className="press flex h-11 items-center gap-1.5 rounded-pill border border-border bg-surface px-3.5 font-display text-[0.9375rem] font-semibold text-deep-blue"
            >
              <Receipt size={18} />
              Expense
            </ExpenseButton>
          <Link
            href="/settings"
            aria-label="Settings"
            className="press grid h-11 w-11 shrink-0 place-items-center rounded-pill border border-border bg-surface text-deep-blue"
          >
            <GearSix size={20} />
          </Link>
          </div>
        }
      />
      <DeliverForm key={today} drivers={drivers} price={price} today={today} initialCustomer={customer} />
    </div>
  );
}
