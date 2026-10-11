"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Money screens are shown at once from the phone's cache, then checked
 * against the server every time they are opened or the app comes back to the
 * front, so a sale logged on another phone is never missing for long. */
export function Fresh() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
    const refresh = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [router]);
  return null;
}
