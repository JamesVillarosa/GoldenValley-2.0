import { connection } from "next/server";
import { lastWorkday } from "@/lib/dates";
import { HistoryView } from "@/components/history-view";

export default async function HistoryPage() {
  // Without this the page is prerendered and "today" is frozen at build time.
  await connection();
  const today = lastWorkday();
  return <HistoryView key={today} today={today} />;
}
