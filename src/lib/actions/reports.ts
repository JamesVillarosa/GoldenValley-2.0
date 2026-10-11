"use server";

import { safe } from "@/lib/result";
import { revalidatePath } from "next/cache";
import { manilaToday } from "@/lib/dates";
import { db } from "@/lib/supabase/server";
import type { Bonus, Expense, Payout } from "@/lib/supabase/types";

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
  role: "driver" | "washer";
  bonuses: Bonus[];
  /** Pesos for the period, summed by the database from each day worked */
  base_pay: number;
  commission_pay: number;
  bonus: number;
  total: number;
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

export interface Owed {
  driver_id: string;
  /** Earned up to the date minus everything ever paid, bale included.
   * Negative = paid ahead. */
  owed: number;
}

/** What each driver is still owed as of a date (see `driver_owed` in SQL). */
export async function getOwed(asOf: string): Promise<Owed[]> {
  const supabase = await db();
  const { data, error } = await supabase.rpc("driver_owed", { p_as_of: asOf });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Pays the driver everything still owed as of the date. The database works
 * the amount out under a lock, so a stale screen or a double tap can never pay
 * the wrong amount. Returns the pesos recorded. */
export const recordPayout = safe(async (driverId: string, asOf: string): Promise<number> => {
  const supabase = await db();
  const { data, error } = await supabase.rpc("pay_driver", { p_driver: driverId, p_as_of: asOf });
  if (error) throw new Error(error.message);
  if (!(Number(data) > 0)) throw new Error("Nothing left to pay.");
  revalidatePath("/", "layout");
  return Number(data);
});

/** Removes one payout or bale. */
export const undoPayout = safe(async (payoutId: string): Promise<void> => {
  const supabase = await db();
  const { error } = await supabase.from("payouts").delete().eq("id", payoutId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
});

/** Bale: salary handed to a driver early, taken out of the day's collection. */
export const addAdvance = safe(async (driverId: string, amount: number, date: string): Promise<void> => {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be more than 0.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > manilaToday()) throw new Error("Date cannot be in the future.");
  const supabase = await db();
  const { error } = await supabase
    .from("payouts")
    .insert({ driver_id: driverId, period_from: date, period_to: date, amount, kind: "advance" });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
});

export interface Deduction {
  id: string;
  label: string;
  amount: number;
  kind: "expense" | "bale";
}

/** What a driver paid out of the day's collection: expenses and bale. Both
 * come off the cash the driver hands over at the end of the day. */
export async function getDriverDeductions(driverId: string, date: string): Promise<Deduction[]> {
  const supabase = await db();
  const [spent, bale] = await Promise.all([
    supabase.from("expenses").select("id, category, amount").eq("driver_id", driverId).eq("spent_on", date),
    supabase.from("payouts").select("id, amount").eq("driver_id", driverId).eq("kind", "advance").eq("period_to", date),
  ]);
  if (spent.error) throw new Error(spent.error.message);
  if (bale.error) throw new Error(bale.error.message);
  return [
    ...(spent.data ?? []).map((e) => ({ id: e.id, label: e.category, amount: Number(e.amount), kind: "expense" as const })),
    ...(bale.data ?? []).map((p) => ({ id: p.id, label: "Bale", amount: Number(p.amount), kind: "bale" as const })),
  ];
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

export const addExpense = safe(async (input: {
  category: string;
  amount: number;
  date: string;
  monthly: boolean;
  /** The driver who paid it out of the day's collection; omitted = the manager paid. */
  driverId?: string | null;
}): Promise<void> => {
  if (!input.category.trim()) throw new Error("Pick what the expense was for.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Amount must be more than 0.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || input.date > manilaToday()) {
    throw new Error("Expense date cannot be in the future.");
  }
  const supabase = await db();
  const { error } = await supabase.from("expenses").insert({
    category: input.category.trim(),
    amount: input.amount,
    spent_on: input.date,
    monthly: input.monthly,
    driver_id: input.monthly ? null : (input.driverId ?? null),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
});

export const deleteExpense = safe(async (expenseId: string): Promise<void> => {
  const supabase = await db();
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
});
