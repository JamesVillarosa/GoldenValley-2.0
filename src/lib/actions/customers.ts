"use server";

import { revalidatePath } from "next/cache";
import { manilaToday, shiftDays } from "@/lib/dates";
import { db } from "@/lib/supabase/server";
import type { Customer } from "@/lib/supabase/types";

export async function searchCustomers(driverId: string, query: string): Promise<Customer[]> {
  const supabase = await db();
  let request = supabase
    .from("customers")
    .select("*")
    .eq("driver_id", driverId)
    .order("name", { ascending: true })
    .limit(20);

  if (query.trim()) request = request.ilike("name", `%${query.trim()}%`);

  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAllCustomers(): Promise<Customer[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name", { ascending: true })
    // PostgREST caps a response at 1000 rows by default; the business has ~400.
    .limit(1000);

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Customers whose learned schedule says they order today or tomorrow, plus
 * those who are late. Anything more than two weeks late is `lapsed`: worth a
 * follow-up call, but not part of today's load. */
export async function getDueCustomers(): Promise<{ due: Customer[]; lapsed: Customer[] }> {
  const supabase = await db();
  const today = manilaToday();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .lte("expected_next_date", shiftDays(today, 1))
    .order("expected_next_date", { ascending: true })
    .limit(1000);

  if (error) throw new Error(error.message);
  const cutoff = shiftDays(today, -14);
  const rows: Customer[] = data ?? [];
  return {
    due: rows.filter((c) => c.expected_next_date! >= cutoff),
    lapsed: rows.filter((c) => c.expected_next_date! < cutoff),
  };
}

export async function getCustomer(customerId: string): Promise<Customer | null> {
  const supabase = await db();
  const { data, error } = await supabase.from("customers").select("*").eq("id", customerId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export interface CustomerInput {
  id?: string;
  name: string;
  driverId: string;
  phone?: string;
  address?: string;
  containersOut?: number;
  /** null or omitted = station price */
  pricePerGallon?: number | null;
}

export async function saveCustomer(input: CustomerInput): Promise<Customer> {
  const name = input.name.trim();
  if (!name) throw new Error("Customer name is required.");
  if (!input.driverId) throw new Error("Pick a driver for this customer.");
  const containers = input.containersOut ?? 0;
  if (!Number.isInteger(containers) || containers < 0) {
    throw new Error("Containers must be a whole number, 0 or more.");
  }

  const price = input.pricePerGallon ?? null;
  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    throw new Error("Price must be 0 or more.");
  }

  const row = {
    name,
    driver_id: input.driverId,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    containers_out: containers,
    price_per_gallon: price,
  };

  const supabase = await db();
  const request = input.id
    ? supabase.from("customers").update(row).eq("id", input.id)
    : supabase.from("customers").insert(row);
  const { data, error } = await request.select("*").single();

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  return data;
}
