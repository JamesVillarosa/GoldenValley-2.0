import Link from "next/link";
import { eachDayOfInterval, eachMonthOfInterval, format, parseISO } from "date-fns";
import { getStats } from "@/lib/actions/reports";
import { manilaToday, resolveRange } from "@/lib/dates";
import { gal, peso } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { PeriodNav } from "@/components/period-nav";

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="num text-xl font-semibold">{value}</dd>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { p, d } = await searchParams;
  const range = resolveRange(p as string, d as string);
  const stats = await getStats(range.from, range.to, range.unit);

  const interval = { start: parseISO(range.from), end: parseISO(range.to) };
  const byBucket = new Map(stats.series.map((s) => [s.bucket, Number(s.gallons)]));
  const buckets = (range.unit === "month" ? eachMonthOfInterval(interval) : eachDayOfInterval(interval)).map(
    (date) => {
      const key = format(date, "yyyy-MM-dd");
      return { key, date, gallons: byBucket.get(key) ?? 0 };
    }
  );
  const peak = Math.max(1, ...buckets.map((b) => b.gallons));
  const today = manilaToday();
  const tick = (date: Date, i: number) =>
    range.period === "year"
      ? format(date, "MMMMM")
      : range.period === "week"
        ? format(date, "EEEEE")
        : i % 7 === 0
          ? format(date, "d")
          : "";
  const topDriver = Math.max(1, ...stats.by_driver.map((x) => Number(x.gallons)));

  return (
    <div className="page">
      <PageHeader title="Dashboard" />
      <PeriodNav path="/dashboard" range={range} />

      <div className="flex flex-col gap-6">
        <dl className="card overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <dt className="text-sm text-ink-muted">Gallons delivered</dt>
            <dd className="num text-[2.5rem] leading-none font-semibold text-deep-blue">
              {Number(stats.gallons).toLocaleString("en-PH")}
            </dd>
          </div>
          <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
            <Figure label="Deliveries" value={String(stats.deliveries)} />
            <Figure label="Customers served" value={String(stats.customers)} />
          </div>
          <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
            <Figure label="Sales" value={peso(stats.sales)} />
            <Figure label="Unpaid" value={peso(stats.unpaid)} />
          </div>
        </dl>

        {range.period !== "day" && (
          <section aria-labelledby="chart-title">
            <div className="flex items-baseline justify-between pb-2">
              <h2 id="chart-title" className="section-title">
                {range.unit === "month" ? "Gallons per month" : "Gallons per day"}
              </h2>
              <p className="num text-sm text-ink-muted">peak {gal(peak === 1 && !stats.gallons ? 0 : peak)}</p>
            </div>
            <ol className="card flex h-44 items-stretch gap-[3px] px-3 pt-4 pb-2">
              {buckets.map((b, i) => (
                <li key={b.key} className="flex min-w-0 flex-1 flex-col justify-end gap-1.5">
                  <span className="sr-only">
                    {format(b.date, range.unit === "month" ? "MMMM" : "MMM d")}: {gal(b.gallons)}
                  </span>
                  <span
                    aria-hidden
                    className={`bar-in rounded-t-[3px] ${b.key > today ? "bg-border" : "bg-deep-blue"}`}
                    style={{ height: `${Math.max(b.gallons ? 4 : 1, (b.gallons / peak) * 100)}%` }}
                  />
                  <span aria-hidden className="h-4 text-center text-[0.6875rem] leading-4 text-ink-muted">
                    {tick(b.date, i)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section aria-labelledby="drivers-title">
          <h2 id="drivers-title" className="section-title pb-2">
            By driver
          </h2>
          {stats.by_driver.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-6 py-8 text-center text-[0.9375rem] text-ink-muted">
              No deliveries in this period. Log one on the Deliver tab.
            </p>
          ) : (
            <ul className="card divide-y divide-border">
              {stats.by_driver.map((driver) => (
                <li key={driver.name} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium">{driver.name}</span>
                    <span className="num shrink-0 font-semibold">{gal(driver.gallons)}</span>
                  </div>
                  <div
                    aria-hidden
                    className="mt-2 h-1.5 rounded-pill bg-aqua"
                    style={{ width: `${Math.max(2, (Number(driver.gallons) / topDriver) * 100)}%` }}
                  />
                  <p className="mt-1.5 text-sm text-ink-muted">
                    {driver.deliveries} {driver.deliveries === 1 ? "delivery" : "deliveries"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {stats.top_customers.length > 0 && (
          <section aria-labelledby="top-title">
            <h2 id="top-title" className="section-title pb-2">
              Top customers
            </h2>
            <ol className="card divide-y divide-border">
              {stats.top_customers.map((c) => (
                <li key={c.id}>
                  <Link href={`/customers/${c.id}`} className="flex items-baseline justify-between gap-3 px-4 py-3 active:bg-mist">
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="num shrink-0 font-semibold">{gal(c.gallons)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section aria-labelledby="now-title">
          <h2 id="now-title" className="section-title pb-2">
            Right now
          </h2>
          <dl className="card grid grid-cols-2 divide-x divide-border">
            <Figure label="Customers owe" value={peso(stats.balance_all)} />
            <Figure label="Containers lent out" value={String(stats.containers_out)} />
          </dl>
        </section>
      </div>
    </div>
  );
}
