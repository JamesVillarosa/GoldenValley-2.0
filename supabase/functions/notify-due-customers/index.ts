// Daily job: find customers who are due-soon or overdue and push a
// notification to every registered device. Deploy with:
//   supabase functions deploy notify-due-customers
// Schedule with pg_cron once deployed (see the commented SQL at the bottom
// of supabase/migrations/20260829000002_push_cron.sql).
//
// Needs these function secrets (set once the project is provisioned):
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:owner@example.com";

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("name, status")
    .in("status", ["due_soon", "overdue"])
    .order("status", { ascending: true });

  if (customersError) {
    return new Response(JSON.stringify({ error: customersError.message }), {
      status: 500,
    });
  }

  if (!customers || customers.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "nothing due" }), {
      status: 200,
    });
  }

  const overdue = customers.filter((c) => c.status === "overdue").length;
  const dueSoon = customers.length - overdue;
  const body =
    overdue > 0
      ? `${overdue} overdue, ${dueSoon} due soon. Tap to see who's next.`
      : `${dueSoon} customer${dueSoon === 1 ? "" : "s"} due soon.`;

  const { data: subscriptions, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("*");

  if (subsError) {
    return new Response(JSON.stringify({ error: subsError.message }), {
      status: 500,
    });
  }

  const payload = JSON.stringify({
    title: "Golden Valley",
    body,
    url: "/dashboard",
  });

  let sent = 0;
  let removed = 0;

  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        removed++;
      }
    }
  }

  return new Response(JSON.stringify({ sent, removed, due: customers.length }), {
    status: 200,
  });
});
