"use server";

import { createServiceClient } from "@/lib/supabase/server";

export interface SalaryResult {
  totalGallons: number;
  transactionCount: number;
  baseSalary: number;
}

export async function computeSalary(
  driverId: string,
  startDate: string,
  endDate: string
): Promise<SalaryResult> {
  const supabase = createServiceClient();

  const { data: driver, error: driverError } = await supabase
    .from("drivers")
    .select("base_salary")
    .eq("id", driverId)
    .single();
  if (driverError) throw new Error(driverError.message);

  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select("gallons")
    .eq("driver_id", driverId)
    .gte("created_at", `${startDate}T00:00:00`)
    .lte("created_at", `${endDate}T23:59:59.999`);
  if (txError) throw new Error(txError.message);

  const totalGallons = (transactions ?? []).reduce(
    (sum, t) => sum + Number(t.gallons),
    0
  );

  return {
    totalGallons,
    transactionCount: transactions?.length ?? 0,
    baseSalary: Number(driver.base_salary),
  };
}
