"use server";

import { createServiceClient } from "@/lib/supabase/server";

export interface CustomerGallons {
  customerId: string;
  customerName: string;
  gallons: number;
}

export interface SalaryResult {
  totalGallons: number;
  transactionCount: number;
  dailySalary: number;
  ratePerGallon: number;
  baseSalary: number;
  commission: number;
  totalSalary: number;
  customerBreakdown: CustomerGallons[];
}

export async function computeSalary(
  driverId: string,
  date: string
): Promise<SalaryResult> {
  const supabase = createServiceClient();

  const { data: driver, error: driverError } = await supabase
    .from("drivers")
    .select("base_salary, rate_per_gallon")
    .eq("id", driverId)
    .single();
  if (driverError) throw new Error(driverError.message);

  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select("gallons, customer_id, customers(name)")
    .eq("driver_id", driverId)
    .is("settled_at", null)
    .gte("created_at", `${date}T00:00:00`)
    .lte("created_at", `${date}T23:59:59.999`);
  if (txError) throw new Error(txError.message);

  const rows = transactions ?? [];
  const totalGallons = rows.reduce((sum, t) => sum + Number(t.gallons), 0);

  const byCustomer = new Map<string, CustomerGallons>();
  for (const row of rows) {
    const existing = byCustomer.get(row.customer_id);
    const customers = row.customers as unknown as
      | { name: string }
      | { name: string }[]
      | null;
    const name = Array.isArray(customers) ? customers[0]?.name : customers?.name;
    if (existing) {
      existing.gallons += Number(row.gallons);
    } else {
      byCustomer.set(row.customer_id, {
        customerId: row.customer_id,
        customerName: name ?? "Unknown customer",
        gallons: Number(row.gallons),
      });
    }
  }
  const customerBreakdown = Array.from(byCustomer.values()).sort(
    (a, b) => b.gallons - a.gallons
  );

  const dailySalary = Number(driver.base_salary);
  const ratePerGallon = Number(driver.rate_per_gallon);
  const commission = ratePerGallon * totalGallons;

  return {
    totalGallons,
    transactionCount: rows.length,
    dailySalary,
    ratePerGallon,
    baseSalary: dailySalary,
    commission,
    totalSalary: dailySalary + commission,
    customerBreakdown,
  };
}
