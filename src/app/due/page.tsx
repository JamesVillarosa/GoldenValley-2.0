import { getDueCustomers } from "@/lib/actions/customers";
import { getDrivers } from "@/lib/actions/drivers";
import { manilaToday } from "@/lib/dates";
import { DueList } from "@/components/due-list";

export default async function DuePage() {
  const [{ due, lapsed }, drivers] = await Promise.all([getDueCustomers(), getDrivers()]);
  return <DueList due={due} lapsed={lapsed} drivers={drivers} today={manilaToday()} />;
}
