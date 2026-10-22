"use server";

import { safe } from "@/lib/result";
import { revalidatePath } from "next/cache";
import { isClosed, manilaToday } from "@/lib/dates";
import { amountFor, type Pricing } from "@/lib/format";
import { db } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/supabase/types";

// The time of day in Manila right now, so entries for a past day keep the
// order they were typed in.
const manilaClock = () =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(
    new Date()
  );

export interface SaveTransactionInput {
  /** Both null for a walk-in sale at the station. */
  customerId: string | null;
  driverId: string | null;
  gallons: number;
  /** Business day (yyyy-MM-dd). Earlier than today = backdated entry. */
  date: string;
  /** Walk-in only: pesos per gallon charged at the counter. */
  price?: number;
}

export const saveTransaction = safe(async (input: SaveTransactionInput): Promise<Transaction> => {
  if (!input.customerId !== !input.driverId) throw new Error("Pick a customer first.");
  if (!Number.isFinite(input.gallons) || input.gallons <= 0) {
    throw new Error("Gallons must be a positive number.");
  }
  const today = manilaToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || input.date > today) {
    throw new Error("Delivery date cannot be in the future.");
  }
  if (isClosed(input.date)) throw new Error("The station is closed on Sundays. Pick another day.");

  const supabase = await db();
  const [{ data: settings, error: settingsError }, { data: customer }] = await Promise.all([
    supabase.from("settings").select("price_per_gallon").single(),
    input.customerId
      ? supabase.from("customers").select("price_per_gallon, price_qty, deal_price").eq("id", input.customerId).single()
      : { data: null },
  ]);
  if (settingsError) throw new Error(settingsError.message);

  // A walk-in is charged the price typed at the counter, which is remembered
  // for the next walk-in.
  let walkInPrice = Number(settings.price_per_gallon);
  if (!input.customerId && input.price !== undefined) {
    if (!Number.isFinite(input.price) || input.price < 0) throw new Error("Price must be 0 or more.");
    walkInPrice = input.price;
    await supabase.from("settings").update({ price_per_gallon: walkInPrice }).eq("id", true);
  }
  // The price is copied onto the row so later price changes never rewrite
  // history. With a deal it is the average per gallon for this sale.
  const unitPrice = amountFor(input.gallons, customer, walkInPrice) / input.gallons;

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      customer_id: input.customerId,
      driver_id: input.driverId,
      gallons: input.gallons,
      unit_price: unitPrice,
      // A walk-in pays at the counter. A delivery is listed before the driver
      // leaves, so it starts unpaid and is marked paid when the driver is back.
      paid: !input.customerId,
      // delivered_on is derived from created_at, so a backdated entry is
      // stamped on the day it belongs to, at the current time of day.
      ...(input.date < today && { created_at: `${input.date}T${manilaClock()}+08:00` }),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  return data;
});

export const deleteTransaction = safe(async (transactionId: string): Promise<void> => {
  const supabase = await db();
  const { error } = await supabase.from("transactions").delete().eq("id", transactionId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
});

export const setGallons = safe(async (transactionId: string, gallons: number): Promise<void> => {
  if (!Number.isFinite(gallons) || gallons <= 0) throw new Error("Gallons must be a positive number.");
  const supabase = await db();
  // A deal price depends on how many gallons were bought, so it is worked out
  // again. Without a deal the sale keeps the price it was sold at.
  const { data: tx } = await supabase
    .from("transactions")
    .select("unit_price, customers(price_per_gallon, price_qty, deal_price)")
    .eq("id", transactionId)
    .single();
  const pricing = tx?.customers as unknown as Pricing | null;
  const unit_price =
    pricing && pricing.price_qty > 1 && pricing.deal_price != null
      ? amountFor(gallons, pricing, 0) / gallons
      : tx?.unit_price;
  const { error } = await supabase.from("transactions").update({ gallons, unit_price }).eq("id", transactionId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
});

export const setPaid = safe(async (transactionId: string, paid: boolean, toManager = false): Promise<void> => {
  const supabase = await db();
  const { error } = await supabase
    .from("transactions")
    .update({ paid, paid_to_manager: paid && toManager })
    .eq("id", transactionId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
});

/** Customer paid off everything they owe. */
export const settleCustomer = safe(async (customerId: string): Promise<void> => {
  const supabase = await db();
  const { error } = await supabase
    .from("transactions")
    .update({ paid: true })
    .eq("customer_id", customerId)
    .eq("paid", false);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
});

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
  driverName: string | null;
}

/** One driver's deliveries for a day; `null` lists the walk-in sales and
 * "all" lists everything sold that day. */
export async function getDriverDeliveries(driverId: string | null, date: string): Promise<DriverDelivery[]> {
  const supabase = await db();
  let request = supabase.from("transactions").select("*, customers(name), drivers(name)").eq("delivered_on", date);
  if (driverId !== "all") request = driverId ? request.eq("driver_id", driverId) : request.is("driver_id", null);
  // First sale of the day on top, in the order they were entered.
  const { data, error } = await request.order("created_at", { ascending: true }).limit(1000);

  if (error) throw new Error(error.message);

  return (data ?? []).map(({ customers, drivers, ...row }) => ({
    ...row,
    // A sale with a driver but no customer belonged to a customer since deleted.
    customerName:
      (customers as unknown as { name: string } | null)?.name ?? (row.driver_id ? "Deleted customer" : "Walk-in"),
    driverName: (drivers as unknown as { name: string } | null)?.name ?? null,
  }));
}
