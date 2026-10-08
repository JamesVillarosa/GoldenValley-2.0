import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { manilaToday, shiftDays } from "@/lib/dates";

/** Push today's due summary to every subscribed phone. */
export async function notifyDue(supabase: SupabaseClient) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:owner@goldenvalley.local",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const today = manilaToday();
  const [{ data: due, error }, { data: drivers }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("customers")
      .select("driver_id, usual_gallons")
      .lte("expected_next_date", today)
      .gte("expected_next_date", shiftDays(today, -14))
      .limit(1000),
    supabase.from("drivers").select("id, name").eq("active", true),
    supabase.from("push_subscriptions").select("*"),
  ]);
  if (error) throw new Error(error.message);

  const rows = due ?? [];
  const gallons = rows.reduce((sum, c) => sum + Number(c.usual_gallons ?? 0), 0);
  const perDriver = (drivers ?? [])
    .map((d) => ({ name: d.name, count: rows.filter((c) => c.driver_id === d.id).length }))
    .filter((d) => d.count > 0)
    .map((d) => `${d.name}: ${d.count}`)
    .join(" · ");

  const payload = JSON.stringify({
    title: rows.length
      ? `${rows.length} ${rows.length === 1 ? "customer" : "customers"} due today`
      : "No customers due today",
    body: rows.length ? `About ${gallons} gal to load. ${perDriver}` : "Nobody is expected to order today.",
    url: "/due",
  });

  let sent = 0;
  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      sent++;
    } catch (err) {
      // 404/410: the phone unsubscribed or uninstalled the app.
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
  return { due: rows.length, sent };
}
