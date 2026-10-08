import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ChatText, PencilSimple, Phone, Plus } from "@phosphor-icons/react/dist/ssr";
import { getCustomer } from "@/lib/actions/customers";
import { getCustomerTransactions } from "@/lib/actions/transactions";
import { getDrivers } from "@/lib/actions/drivers";
import { peso } from "@/lib/format";
import { CustomerHistory } from "@/components/customer-history";
import { DropletStatus } from "@/components/droplet-status";

const ACTION = "press flex h-12 flex-1 items-center justify-center gap-2 rounded-pill border font-display font-semibold";
const QUIET = `${ACTION} border-border bg-surface text-deep-blue`;

export default async function CustomerDetailPage({ params }: PageProps<"/customers/[id]">) {
  const { id } = await params;
  const [customer, transactions, drivers] = await Promise.all([
    getCustomer(id),
    getCustomerTransactions(id),
    getDrivers(),
  ]);
  if (!customer) notFound();

  const driver = drivers.find((d) => d.id === customer.driver_id);
  const facts = [
    ["Orders", customer.computed_interval_days && customer.status !== "new" ? `Every ${customer.computed_interval_days} days` : "Not enough history"],
    ["Next expected", customer.expected_next_date ? format(parseISO(customer.expected_next_date), "EEE, MMM d") : "After first delivery"],
    ["Usual order", customer.usual_gallons != null ? `${customer.usual_gallons} gal` : "Unknown yet"],
    ["Containers lent", String(customer.containers_out)],
  ];

  return (
    <div className="page flex flex-col gap-6">
      <header>
        <div className="flex items-start gap-3">
          <DropletStatus status={customer.status} size={28} className="mt-1.5" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]">
              {customer.name}
            </h1>
            <p className="mt-0.5 text-[0.9375rem] text-ink-muted">
              {[customer.address, driver?.name].filter(Boolean).join(" · ") || "No address yet"}
            </p>
          </div>
          <Link
            href={`/customers/${customer.id}/edit`}
            aria-label="Edit customer"
            className="press grid h-11 w-11 shrink-0 place-items-center rounded-pill border border-border bg-surface text-deep-blue"
          >
            <PencilSimple size={18} />
          </Link>
        </div>

        <div className="mt-4 flex gap-2">
          {customer.phone && (
            <>
              <a href={`tel:${customer.phone}`} className={QUIET}>
                <Phone size={18} />
                Call
              </a>
              <a href={`sms:${customer.phone}`} className={QUIET}>
                <ChatText size={18} />
                Text
              </a>
            </>
          )}
          <Link href={`/?customer=${customer.id}`} className={`${ACTION} border-deep-blue bg-deep-blue text-white`}>
            <Plus size={18} weight="bold" />
            Deliver
          </Link>
        </div>
        {!customer.phone && (
          <p className="mt-2 text-sm text-ink-muted">Add a mobile number to call or text from here.</p>
        )}
      </header>

      <dl className="card grid grid-cols-2">
        {facts.map(([label, value], i) => (
          <div key={label} className={`px-4 py-3 ${i % 2 ? "border-l" : ""} ${i > 1 ? "border-t" : ""} border-border`}>
            <dt className="text-sm text-ink-muted">{label}</dt>
            <dd className="num font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <CustomerHistory
        customerId={customer.id}
        transactions={transactions}
        balanceLabel={peso(customer.balance)}
        owes={customer.balance > 0}
      />
    </div>
  );
}
