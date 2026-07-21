"use client";

import { useEffect } from "react";
import { getHubServiceWorkerRegistration } from "@/lib/pwa";

/**
 * Registers the Hub minimal SW once with hardcoded scope `/dashboard/`.
 * Call only from the dashboard layout — never from landing/root.
 */
export function useRegisterHubServiceWorker(): void {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const { scriptUrl, options } = getHubServiceWorkerRegistration();
    void navigator.serviceWorker.register(scriptUrl, options).catch((error) => {
      console.error("Hub service worker registration failed:", error);
    });
  }, []);
}
