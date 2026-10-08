import { getSalaries } from "@/lib/actions/reports";
import { resolveRange } from "@/lib/dates";
import { gal, peso } from "@/lib/format";
import { salaryOf } from "@/lib/salary";
import { DriverEditor } from "@/components/driver-editor";
import { PageHeader } from "@/components/page-header";
import { PeriodNav } from "@/components/period-nav";

export default async function SalaryPage({ searchParams }: PageProps<"/salary">) {
  const { p, d } = await searchParams;
  const range = resolveRange(p === "year" ? "month" : (p as string), d as string);
  const drivers = await getSalaries(range.from, range.to);
  const payroll = drivers.reduce((sum, driver) => sum + salaryOf(driver).total, 0);

  return (
    <div className="page">
      <PageHeader title="Salary" sub={`Total payroll ${peso(payroll)}`} />
      <PeriodNav path="/salary" range={range} periods={["day", "week", "month"]} />

      <ul className="flex flex-col gap-4">
        {drivers.map((driver) => {
          const pay = salaryOf(driver);
          return (
            <li key={driver.id} className="card">
              <div className="flex items-baseline justify-between gap-3 px-4 pt-4">
                <h2 className="truncate font-display text-lg font-semibold">{driver.name}</h2>
                <p className="num shrink-0 text-2xl font-semibold text-deep-blue">{peso(pay.total)}</p>
              </div>
              <dl className="flex flex-col gap-1.5 px-4 pt-2 pb-4 text-[0.9375rem]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">
                    Base, {peso(driver.base_salary)} × {driver.days_worked}{" "}
                    {driver.days_worked === 1 ? "day" : "days"}
                  </dt>
                  <dd className="num font-medium">{peso(pay.base)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">
                    Commission, {gal(driver.gallons)} × {peso(driver.rate_per_gallon)}
                  </dt>
                  <dd className="num font-medium">{peso(pay.commission)}</dd>
                </div>
              </dl>

              {driver.customers.length > 0 && (
                <details className="border-t border-border">
                  <summary className="flex min-h-12 cursor-pointer items-center px-4 font-medium text-deep-blue">
                    {driver.customers.length} {driver.customers.length === 1 ? "customer" : "customers"},{" "}
                    {driver.deliveries} {driver.deliveries === 1 ? "delivery" : "deliveries"}
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

              <DriverEditor driver={driver} canRemove={drivers.length > 1} />
            </li>
          );
        })}
        <li className="card">
          <DriverEditor />
        </li>
      </ul>
    </div>
  );
}
