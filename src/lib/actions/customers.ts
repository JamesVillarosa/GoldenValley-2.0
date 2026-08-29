"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { Customer } from "@/lib/supabase/types";

export async function searchCustomers(
  driverId: string,
  query: string
): Promise<Customer[]> {
  const supabase = createServiceClient();
  let request = supabase
    .from("customers")
    .select("*")
    .eq("driver_id", driverId)
    .order("name", { ascending: true })
    .limit(20);

  if (query.trim()) {
    request = request.ilike("name", `%${query.trim()}%`);
  }

  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAllCustomers(query: string): Promise<Customer[]> {
  const supabase = createServiceClient();
  let request = supabase
    .from("customers")
    .select("*")
    .order("name", { ascending: true });

  if (query.trim()) {
    request = request.ilike("name", `%${query.trim()}%`);
  }

  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getDueCustomers(): Promise<Customer[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .in("status", ["due_soon", "overdue"])
    .order("expected_next_date", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCustomer(customerId: string): Promise<Customer | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function createCustomer(
  driverId: string,
  name: string
): Promise<Customer> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Customer name is required.");

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ driver_id: driverId, name: trimmed })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/customers");
  return data;
}

export async function updateManualInterval(
  customerId: string,
  days: number | null
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("customers")
    .update({ manual_interval_days: days })
    .eq("id", customerId);

  if (error) throw new Error(error.message);
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/dashboard");
}
