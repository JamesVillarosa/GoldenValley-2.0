import type { DriverSalary } from "@/lib/actions/reports";

/** Base salary is per day worked; commission is per gallon delivered. */
export function salaryOf(d: Pick<DriverSalary, "base_salary" | "rate_per_gallon" | "gallons" | "days_worked">) {
  const base = Number(d.base_salary) * Number(d.days_worked);
  const commission = Number(d.rate_per_gallon) * Number(d.gallons);
  return { base, commission, total: base + commission };
}
