import { ALARM_TEXT, type Alarm } from "@/lib/alarm";
import { sendToAll } from "@/lib/push";
import { createServiceClient } from "@/lib/supabase/server";

// Called every few seconds by pg_cron (job "gv-alarm") while an alarm is due.
// Only a caller holding ALARM_SECRET may trigger pushes.
export async function POST(request: Request) {
  const secret = process.env.ALARM_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("alarm_due");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const alarm = data as Alarm;
  if (!alarm) return Response.json({ alarm: null, sent: 0 });

  const sent = await sendToAll(supabase, JSON.stringify({ ...ALARM_TEXT[alarm], alarm: true }));
  return Response.json({ alarm, sent });
}
