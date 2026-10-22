"use server";

import { revalidatePath } from "next/cache";
import { manilaToday } from "@/lib/dates";
import { safe } from "@/lib/result";
import { db } from "@/lib/supabase/server";

/** Facts behind today's alarms; the phone compares them with its clock. */
export async function getAlarmFacts(): Promise<{ hasSales: boolean; checked: boolean }> {
  const supabase = await db();
  const today = manilaToday();
  const [sales, check] = await Promise.all([
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("delivered_on", today),
    supabase.from("alarm_checks").select("day").eq("day", today).maybeSingle(),
  ]);
  if (sales.error) throw new Error(sales.error.message);
  return { hasSales: (sales.count ?? 0) > 0, checked: !!check.data };
}

/** "Paid and unpaid checked" for today: stops the evening alarm. */
export const markChecked = safe(async (): Promise<void> => {
  const supabase = await db();
  const { error } = await supabase.from("alarm_checks").upsert({ day: manilaToday() });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
});
