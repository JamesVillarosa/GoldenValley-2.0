"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { Driver } from "@/lib/supabase/types";

export async function getDrivers(): Promise<Driver[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateDriverRates(
  driverId: string,
  dailySalary: number,
  ratePerGallon: number
): Promise<Driver> {
  if (!Number.isFinite(dailySalary) || dailySalary < 0) {
    throw new Error("Daily salary must be a non-negative number.");
  }
  if (!Number.isFinite(ratePerGallon) || ratePerGallon < 0) {
    throw new Error("Rate per gallon must be a non-negative number.");
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("drivers")
    .update({ base_salary: dailySalary, rate_per_gallon: ratePerGallon })
    .eq("id", driverId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/salary");
  return data;
}
