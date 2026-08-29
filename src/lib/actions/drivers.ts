"use server";

import { createServiceClient } from "@/lib/supabase/server";
import type { Driver } from "@/lib/supabase/types";

export async function getDrivers(): Promise<Driver[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
