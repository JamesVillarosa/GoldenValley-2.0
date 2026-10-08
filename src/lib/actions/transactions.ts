"use server";

import { revalidatePath } from "next/cache";
import { manilaToday } from "@/lib/dates";
import { db } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/supabase/types";

export interface SaveTransactionInput {
  /** Both null for a walk-in sale at the station. */
  customerId: string | null;
  driverId: string | null;
  gallons: number;
  /** Business day (yyyy-MM-dd). Earlier than today = backdated entry. */
  date: string;
}

export async function saveTransaction(input: SaveTransactionInput): Promise<Transaction> {
  if (!input.customerId !== !input.driverId) throw new Error("Pick a customer first.");
  if (!Number.isFinite(input.gallons) || input.gallons <= 0) {
    throw new Error("Gallons must be a positive number.");
  }
  const today = manilaToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || input.date > today) {
    throw new Error("Delivery date cannot be in the future.");
  }

  const supabase = await db();
  // Price is copied onto the row so later price changes never rewrite history.
  const [{ data: settings, error: settingsError }, { data: customer }] = await Promise.all([
    supabase.from("settings").select("price_per_gallon").single(),
    input.customerId
      ? supabase.from("customers").select("price_per_gallon").eq("id", input.customerId).single()
      : { data: null },
  ]);
  if (settingsError) throw new Error(settingsError.message);

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      customer_id: input.customerId,
      driver_id: input.driverId,
      gallons: input.gallons,
      unit_price: customer?.price_per_gallon ?? settings.price_per_gallon,
      // A walk-in pays at the counter. A delivery is listed before the driver
      // leaves, so it starts unpaid and is marked paid when the driver is back.
      paid: !input.customerId,
      // delivered_on is derived from created_at, so a backdated entry is
      // stamped at noon Manila time on the day it belongs to.
      ...(input.date < today && { created_at: `${input.date}T12:00:00+08:00` }),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  return data;
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const supabase = await db();
  const { error } = await supabase.from("transactions").delete().eq("id", transactionId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function setPaid(transactionId: string, paid: boolean): Promise<void> {
  const supabase = await db();
  const { error } = await supabase.from("transactions").update({ paid }).eq("id", transactionId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/** Customer paid off everything they owe. */
export async function settleCustomer(customerId: string): Promise<void> {
  const supabase = await db();
  const { error } = await supabase
    .from("transactions")
    .update({ paid: true })
    .eq("customer_id", customerId)
    .eq("paid", false);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function getCustomerTransactions(customerId: string): Promise<Transaction[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface DriverDelivery extends Transaction {
  customerName: string;
}

/** One driver's deliveries for a day; `null` lists the walk-in sales. */
export async function getDriverDeliveries(driverId: string | null, date: string): Promise<DriverDelivery[]> {
  const supabase = await db();
  const request = supabase.from("transactions").select("*, customers(name)").eq("delivered_on", date);
  const { data, error } = await (driverId ? request.eq("driver_id", driverId) : request.is("driver_id", null)).order(
    "created_at",
    { ascending: false }
  );

  if (error) throw new Error(error.message);

  return (data ?? []).map(({ customers, ...row }) => ({
    ...row,
    customerName: (customers as unknown as { name: string } | null)?.name ?? "Walk-in",
  }));
}
