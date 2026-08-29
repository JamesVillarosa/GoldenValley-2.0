"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline shell is a progressive enhancement; a failed registration
        // shouldn't block the app.
      });
    }
  }, []);

  return null;
}
