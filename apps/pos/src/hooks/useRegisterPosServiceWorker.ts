"use client";

import { useEffect } from "react";
import { getPosServiceWorkerRegistration } from "@/lib/pwa";

/**
 * Registers the Pos push/install SW once with hardcoded scope `/app/`.
 * Call only from the authenticated `/app` layout — never from landing/root.
 */
export function useRegisterPosServiceWorker(): void {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const { scriptUrl, options } = getPosServiceWorkerRegistration();
    void navigator.serviceWorker.register(scriptUrl, options).catch((error) => {
      console.error("Pos service worker registration failed:", error);
    });
  }, []);
}
