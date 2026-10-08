"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/server";
import type { Driver } from "@/lib/supabase/types";

export async function getDrivers(): Promise<Driver[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface DriverInput {
  id?: string;
  name: string;
  baseSalary: number;
  ratePerGallon: number;
}

export async function saveDriver(input: DriverInput): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("Driver name is required.");
  if (!Number.isFinite(input.baseSalary) || input.baseSalary < 0) {
    throw new Error("Base salary must be 0 or more.");
  }
  if (!Number.isFinite(input.ratePerGallon) || input.ratePerGallon < 0) {
    throw new Error("Commission must be 0 or more.");
  }

  const row = { name, base_salary: input.baseSalary, rate_per_gallon: input.ratePerGallon };
  const supabase = await db();
  const { error } = input.id
    ? await supabase.from("drivers").update(row).eq("id", input.id)
    : await supabase.from("drivers").insert(row);

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/** Drivers are hidden, never deleted: their past deliveries and customers stay. */
export async function removeDriver(driverId: string): Promise<void> {
  const supabase = await db();
  const { count } = await supabase
    .from("drivers")
    .select("id", { count: "exact", head: true })
    .eq("active", true);
  if ((count ?? 0) <= 1) throw new Error("Keep at least one driver.");

  const { error } = await supabase.from("drivers").update({ active: false }).eq("id", driverId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
