"use server";

import { safe } from "@/lib/result";
import { revalidatePath } from "next/cache";
import { lastWorkday, manilaToday, shiftDays, stepWorkday } from "@/lib/dates";
import { db } from "@/lib/supabase/server";
import type { Customer } from "@/lib/supabase/types";

// ilike treats % and _ as wildcards; a typed name must match literally.
const literal = (text: string) => text.replace(/[\\%_]/g, "\\$&");

/** Searches every customer, whoever usually delivers to them: a customer is
 * one person even on a day the other driver brings their water. */
export async function searchCustomers(query: string): Promise<Customer[]> {
  const supabase = await db();
  let request = supabase.from("customers").select("*").order("name", { ascending: true }).limit(20);

  if (query.trim()) request = request.ilike("name", `%${literal(query.trim())}%`);

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
    .lte("expected_next_date", stepWorkday(today, 1))
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
  area?: string;
  containersOut?: number;
  /** null or omitted = station price */
  pricePerGallon?: number | null;
  /** Gallons in the deal the price was typed as (3 for "50 pesos for 3"). */
  priceQty?: number;
}

/** Places already in use, for the place picker. */
export async function getAreas(): Promise<string[]> {
  const supabase = await db();
  const { data, error } = await supabase.from("customers").select("area").not("area", "is", null).limit(1000);
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((row) => row.area as string))].sort((a, b) => a.localeCompare(b));
}

export const saveCustomer = safe(async (input: CustomerInput): Promise<Customer> => {
  const name = input.name.trim().replace(/\s+/g, " ");
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
  const priceQty = price === null ? 1 : (input.priceQty ?? 1);
  if (!Number.isInteger(priceQty) || priceQty < 1) throw new Error("Gallons in the price must be 1 or more.");

  const row = {
    name,
    driver_id: input.driverId,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    area: input.area?.trim().replace(/\s+/g, " ") || null,
    containers_out: containers,
    price_per_gallon: price,
    price_qty: priceQty,
  };

  const supabase = await db();
  // "Inday" and "inday" are the same person.
  let twin = supabase.from("customers").select("name").ilike("name", literal(name)).limit(1);
  if (input.id) twin = twin.neq("id", input.id);
  const { data: twins } = await twin;
  if (twins?.length) throw new Error(`${twins[0].name} is already a customer. Search for the name to pick them.`);

  const request = input.id
    ? supabase.from("customers").update(row).eq("id", input.id)
    : supabase.from("customers").insert(row);
  const { data, error } = await request.select("*").single();

  if (error) throw new Error(error.message);

  // A new price applies to what is still unpaid on the current day's list;
  // older and already-paid sales keep the price they were sold at.
  if (input.id) {
    const { data: settings } = await supabase.from("settings").select("price_per_gallon").single();
    await supabase
      .from("transactions")
      .update({ unit_price: price ?? settings?.price_per_gallon ?? 0 })
      .eq("customer_id", input.id)
      .eq("delivered_on", lastWorkday())
      .eq("paid", false);
  }

  revalidatePath("/", "layout");
  return data;
});

/** Removes the customer record. Their past sales stay in the reports. */
export const deleteCustomer = safe(async (customerId: string): Promise<void> => {
  const supabase = await db();
  const { error } = await supabase.from("customers").delete().eq("id", customerId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
});
