"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/supabase/types";

export interface SaveTransactionInput {
  customerId: string;
  driverId: string;
  gallons: number;
}

export async function saveTransaction(
  input: SaveTransactionInput
): Promise<Transaction> {
  if (!input.customerId) throw new Error("Pick a customer first.");
  if (!Number.isFinite(input.gallons) || input.gallons <= 0) {
    throw new Error("Gallons must be a positive number.");
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      customer_id: input.customerId,
      driver_id: input.driverId,
      gallons: input.gallons,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/salary");
  revalidatePath(`/customers/${input.customerId}`);
  return data;
}

export async function deleteTransaction(
  transactionId: string,
  customerId: string
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/salary");
  revalidatePath(`/customers/${customerId}`);
}

export async function getCustomerTransactions(
  customerId: string
): Promise<Transaction[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
