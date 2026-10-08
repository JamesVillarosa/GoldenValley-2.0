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

export interface DriverDelivery extends Transaction {
  customerName: string;
}

export async function getDriverDeliveries(
  driverId: string,
  date: string
): Promise<DriverDelivery[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, customers(name)")
    .eq("driver_id", driverId)
    .is("settled_at", null)
    .gte("created_at", `${date}T00:00:00`)
    .lte("created_at", `${date}T23:59:59.999`)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const customers = row.customers as unknown as
      | { name: string }
      | { name: string }[]
      | null;
    const customerName = Array.isArray(customers)
      ? customers[0]?.name
      : customers?.name;
    return { ...row, customerName: customerName ?? "Unknown customer" };
  });
}

export async function resetDriverDay(
  driverId: string,
  date: string
): Promise<number> {
  const supabase = createServiceClient();

  const { data: driver, error: driverError } = await supabase
    .from("drivers")
    .select("name")
    .eq("id", driverId)
    .single();
  if (driverError) throw new Error(driverError.message);

  const deliveries = await getDriverDeliveries(driverId, date);
  if (deliveries.length === 0) return 0;

  const { error: logError } = await supabase.from("delivery_log").insert(
    deliveries.map((tx) => ({
      transaction_id: tx.id,
      customer_id: tx.customer_id,
      customer_name: tx.customerName,
      driver_id: driverId,
      driver_name: driver.name,
      gallons: tx.gallons,
      delivered_at: tx.created_at,
    }))
  );
  if (logError) throw new Error(logError.message);

  // Mark settled rather than delete: delivery history stays intact for the
  // customer-interval algorithm and the customer detail page. Salary and the
  // entry screen's "Today" list only count unsettled rows, so this is what
  // makes those views read as reset.
  const { error } = await supabase
    .from("transactions")
    .update({ settled_at: new Date().toISOString() })
    .in(
      "id",
      deliveries.map((tx) => tx.id)
    );

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/salary");
  revalidatePath("/customers");
  return deliveries.length;
}
