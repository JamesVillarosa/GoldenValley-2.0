"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Bell, BellRinging } from "@phosphor-icons/react/dist/ssr";
import { getVapidPublicKey, saveSubscription, sendTestPush } from "@/lib/actions/push";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function PushOptIn() {
  // null on the server: it cannot know, and guessing breaks hydration.
  const supported = useSyncExternalStore<boolean | null>(() => () => {}, isPushSupported, () => null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supported) return;

    navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      setEnabled(!!subscription);
    });
  }, [supported]);

  async function handleEnable() {
    setLoading(true);
    try {
      // Asked first: phones only show the permission prompt as a direct result
      // of the tap, and refuse it after a wait on the network.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications are blocked for this app. Allow them in the phone's settings, then try again.");
        return;
      }

      const publicKey = (await getVapidPublicKey())?.trim();
      if (!publicKey) {
        toast.error("Push isn't configured yet.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      // A subscription left over from an older install is tied to another key
      // and makes subscribing fail, so it is dropped first.
      await (await registration.pushManager.getSubscription())?.unsubscribe();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      await saveSubscription({
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      });

      setEnabled(true);
      toast.success("Delivery reminders enabled.");
    } catch (error) {
      // The reason is shown so a failure on one phone can be told apart from another.
      toast.error(`Couldn't turn on reminders: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  if (supported === null) return <div className="h-12" />;

  if (!supported) {
    return (
      <p className="text-sm text-ink-muted">
        This browser cannot show notifications. Open the app in Chrome and add it to the home screen.
      </p>
    );
  }

  if (enabled) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-medium text-success-ink">
          <BellRinging size={18} weight="fill" />
          On for this phone
        </p>
        <Button
          variant="secondary"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              const sent = await sendTestPush();
              toast.success(`Sent to ${sent} ${sent === 1 ? "phone" : "phones"}`);
            } catch {
              toast.error("Could not send. Try again.");
            } finally {
              setLoading(false);
            }
          }}
        >
          Send test
        </Button>
      </div>
    );
  }

  return (
    <Button variant="secondary" onClick={handleEnable} disabled={loading} className="w-full">
      <Bell size={18} />
      {loading ? "Turning on..." : "Turn on reminders"}
    </Button>
  );
}
