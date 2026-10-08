"use server";

import { revalidatePath } from "next/cache";
import { manilaToday } from "@/lib/dates";
import { db } from "@/lib/supabase/server";
import type { Expense, Payout } from "@/lib/supabase/types";

export interface Stats {
  gallons: number;
  deliveries: number;
  customers: number;
  sales: number;
  unpaid: number;
  expenses: number;
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

/** Payouts whose period falls inside the range, newest first. A week view
 * therefore counts the days already paid one by one. */
export async function getPayouts(from = "2000-01-01", to = "2999-12-31", limit = 500): Promise<Payout[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("payouts")
    .select("*")
    .gte("period_from", from)
    .lte("period_to", to)
    .order("paid_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function recordPayout(driverId: string, from: string, to: string, amount: number): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Nothing to pay for this period.");
  const supabase = await db();
  const { error } = await supabase
    .from("payouts")
    .insert({ driver_id: driverId, period_from: from, period_to: to, amount });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function deletePayout(payoutId: string): Promise<void> {
  const supabase = await db();
  const { error } = await supabase.from("payouts").delete().eq("id", payoutId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function getExpenses(from: string, to: string): Promise<Expense[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("spent_on", from)
    .lte("spent_on", to)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addExpense(input: { category: string; amount: number; note?: string; date: string }): Promise<void> {
  if (!input.category.trim()) throw new Error("Pick what the expense was for.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Amount must be more than 0.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || input.date > manilaToday()) {
    throw new Error("Expense date cannot be in the future.");
  }
  const supabase = await db();
  const { error } = await supabase.from("expenses").insert({
    category: input.category.trim(),
    amount: input.amount,
    note: input.note?.trim() || null,
    spent_on: input.date,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const supabase = await db();
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
