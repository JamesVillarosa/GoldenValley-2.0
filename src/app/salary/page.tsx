import { getOwed, getPayouts, getSalaries } from "@/lib/actions/reports";
import { lastWorkday, resolveRange } from "@/lib/dates";
import { gal, peso } from "@/lib/format";
import { salaryOf } from "@/lib/salary";
import { Fresh } from "@/components/fresh";
import { DriverEditor } from "@/components/driver-editor";
import { PayoutControl } from "@/components/payout-control";
import { PageHeader } from "@/components/page-header";
import { PeriodNav } from "@/components/period-nav";

export default async function SalaryPage({ searchParams }: PageProps<"/salary">) {
  const { p, d } = await searchParams;
  const range = resolveRange(p === "year" ? "month" : (p as string), d as string);
  // Owed is counted up to the end of the viewed period, never past today.
  const today = lastWorkday();
  const asOf = range.to > today ? today : range.to;
  const [drivers, owed, history] = await Promise.all([
    getSalaries(range.from, range.to),
    getOwed(asOf),
    getPayouts(undefined, undefined, 300),
  ]);
  const payroll = drivers.reduce((sum, driver) => sum + salaryOf(driver).total, 0);
  const owedTo = (driverId: string) => Number(owed.find((o) => o.driver_id === driverId)?.owed ?? 0);
  // Per driver, so paying one driver ahead never hides what another is owed.
  const unpaid = drivers.reduce((sum, d) => sum + Math.max(0, owedTo(d.id)), 0);

  return (
    <div className="page">
      <Fresh />
      <PageHeader title="Salary" sub={
          payroll === 0 && unpaid === 0
            ? "No salary earned in this period"
            : unpaid > 0
              ? `${peso(payroll)} earned in this period, ${peso(unpaid)} still to pay`
              : `${peso(payroll)} earned in this period, all paid`
        } />
      <PeriodNav path="/salary" range={range} periods={["day", "week", "month"]} />

      <ul className="flex flex-col gap-4">
        {drivers.map((driver) => {
          const pay = salaryOf(driver);
          const washer = driver.role === "washer";
          return (
            <li key={driver.id} className="card">
              <div className="flex items-baseline justify-between gap-3 px-4 pt-4">
                <h2 className="truncate font-display text-lg font-semibold">
                  {driver.name}
                  {washer && <span className="font-body text-sm font-normal text-ink-muted"> · washer</span>}
                </h2>
                <p className="num shrink-0 text-2xl font-semibold text-deep-blue">{peso(pay.total)}</p>
              </div>
              <dl className="flex flex-col gap-1.5 px-4 pt-2 pb-4 text-[0.9375rem]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">
                    {washer ? "Daily pay" : "Base"}, {peso(driver.base_salary)} × {driver.days_worked}{" "}
                    {driver.days_worked === 1 ? "day" : "days"}
                  </dt>
                  <dd className="num font-medium">{peso(pay.base)}</dd>
                </div>
                {(!washer || Number(driver.rate_per_gallon) > 0) && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">
                    Commission, {gal(driver.gallons)} × {peso(driver.rate_per_gallon)}
                  </dt>
                  <dd className="num font-medium">{peso(pay.commission)}</dd>
                </div>
                )}
                {driver.bonuses.length > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">
                      Bonus,{" "}
                      {driver.bonuses.map((b) => `${peso(b.amount)} at ${gal(b.gallons)} a day`).join(", ")}
                    </dt>
                    <dd className="num font-medium">{peso(pay.bonus)}</dd>
                  </div>
                )}
              </dl>

              {driver.customers.length > 0 && (
                <details className="border-t border-border">
                  <summary className="flex min-h-12 cursor-pointer items-center px-4 font-medium text-deep-blue">
                    Who they delivered to
                  </summary>
                  <ul className="divide-y divide-border border-t border-border">
                    {driver.customers.map((c) => (
                      <li key={c.name} className="flex justify-between gap-3 px-4 py-2.5">
                        <span className="truncate">{c.name}</span>
                        <span className="num shrink-0 font-medium">{gal(c.gallons)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <PayoutControl
                driverId={driver.id}
                driverName={driver.name}
                asOf={asOf}
                current={asOf === today}
                owed={owedTo(driver.id)}
                history={history.filter((p) => p.driver_id === driver.id)}
              />
              <DriverEditor driver={driver} canRemove={washer || drivers.filter((d) => d.role === "driver").length > 1} />
            </li>
          );
        })}
        <li className="card divide-y divide-border">
          <DriverEditor />
          <DriverEditor role="washer" />
        </li>
      </ul>
    </div>
  );
}
