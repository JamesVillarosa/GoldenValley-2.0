"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellRinging } from "@phosphor-icons/react/dist/ssr";
import { getVapidPublicKey, saveSubscription } from "@/lib/actions/push";

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
  const [supported] = useState(isPushSupported);
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
      const publicKey = await getVapidPublicKey();
      if (!publicKey) {
        toast.error("Push isn't configured yet.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications weren't allowed.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
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
    } catch {
      toast.error("Couldn't enable reminders on this device.");
    } finally {
      setLoading(false);
    }
  }

  if (!supported || enabled) return null;

  return (
    <button
      type="button"
      onClick={handleEnable}
      disabled={loading}
      className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-medium text-[var(--color-deep-blue)] transition-transform duration-150 active:scale-[0.97]"
    >
      {loading ? <BellRinging size={16} /> : <Bell size={16} />}
      Reminders
    </button>
  );
}
