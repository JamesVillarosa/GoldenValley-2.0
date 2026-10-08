"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/supabase/types";

export interface SaveTransactionInput {
  customerId: string;
  driverId: string;
  gallons: number;
  paid: boolean;
}

export async function saveTransaction(input: SaveTransactionInput): Promise<Transaction> {
  if (!input.customerId) throw new Error("Pick a customer first.");
  if (!Number.isFinite(input.gallons) || input.gallons <= 0) {
    throw new Error("Gallons must be a positive number.");
  }

  const supabase = await db();
  // Price is copied onto the row so later price changes never rewrite history.
  const { data: settings, error: settingsError } = await supabase
    .from("settings")
    .select("price_per_gallon")
    .single();
  if (settingsError) throw new Error(settingsError.message);

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      customer_id: input.customerId,
      driver_id: input.driverId,
      gallons: input.gallons,
      unit_price: settings.price_per_gallon,
      paid: input.paid,
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

export async function getDriverDeliveries(driverId: string, date: string): Promise<DriverDelivery[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, customers(name)")
    .eq("driver_id", driverId)
    .eq("delivered_on", date)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map(({ customers, ...row }) => ({
    ...row,
    customerName: (customers as unknown as { name: string } | null)?.name ?? "Unknown customer",
  }));
}
