import type { DriverSalary } from "@/lib/actions/reports";

/** A driver's pay for a period. The sums come from the database
 * (`driver_day_pay`), which works each day out as base salary + commission per
 * gallon + every bonus target reached that day. Nothing is recalculated here,
 * so this screen and the payouts always show the same pesos. */
export function salaryOf(d: Pick<DriverSalary, "base_pay" | "commission_pay" | "bonus" | "total">) {
  return {
    base: Number(d.base_pay),
    commission: Number(d.commission_pay),
    bonus: Number(d.bonus),
    total: Number(d.total),
  };
}
