"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/server";

export interface Stats {
  gallons: number;
  deliveries: number;
  customers: number;
  sales: number;
  unpaid: number;
  balance_all: number;
  containers_out: number;
  by_driver: { name: string; gallons: number; deliveries: number }[];
  series: { bucket: string; gallons: number }[];
  top_customers: { id: string; name: string; gallons: number }[];
}

export async function getStats(from: string, to: string, unit: "day" | "month"): Promise<Stats> {
  const supabase = await db();
  const { data, error } = await supabase.rpc("dashboard_stats", { p_from: from, p_to: to, p_unit: unit });
  if (error) throw new Error(error.message);
  return data;
}

export interface DriverSalary {
  id: string;
  name: string;
  base_salary: number;
  rate_per_gallon: number;
  gallons: number;
  deliveries: number;
  days_worked: number;
  customers: { name: string; gallons: number }[];
}

export async function getSalaries(from: string, to: string): Promise<DriverSalary[]> {
  const supabase = await db();
  const { data, error } = await supabase.rpc("salary_report", { p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return data;
}

export async function getPrice(): Promise<number> {
  const supabase = await db();
  const { data, error } = await supabase.from("settings").select("price_per_gallon").single();
  if (error) throw new Error(error.message);
  return Number(data.price_per_gallon);
}

export async function savePrice(price: number): Promise<void> {
  if (!Number.isFinite(price) || price < 0) throw new Error("Price must be 0 or more.");
  const supabase = await db();
  const { error } = await supabase.from("settings").update({ price_per_gallon: price }).eq("id", true);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
