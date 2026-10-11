import type { DriverSalary } from "@/lib/actions/reports";

/** Base salary is per day worked; commission is per gallon delivered; the
 * bonus is the sum of every daily gallon target the driver reached. */
export function salaryOf(d: Pick<DriverSalary, "base_salary" | "rate_per_gallon" | "gallons" | "days_worked" | "bonus">) {
  const base = Number(d.base_salary) * Number(d.days_worked);
  const commission = Number(d.rate_per_gallon) * Number(d.gallons);
  const bonus = Number(d.bonus);
  return { base, commission, bonus, total: base + commission + bonus };
}
