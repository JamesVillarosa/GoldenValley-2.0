import { isClosed, manilaToday } from "@/lib/dates";
import { notifyDue } from "@/lib/push";
import { createServiceClient } from "@/lib/supabase/server";

// Runs once a day from Vercel Cron (see vercel.json). Vercel sends
// `Authorization: Bearer $CRON_SECRET`; nothing else may trigger it.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();
  // Statuses drift as the calendar moves even with no new delivery.
  const { error } = await supabase.rpc("recompute_all_customer_schedules");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Closed on Sundays: no reminder. (The test button in Settings still sends.)
  if (isClosed(manilaToday())) return Response.json({ due: 0, sent: 0, closed: true });

  return Response.json(await notifyDue(supabase));
}
