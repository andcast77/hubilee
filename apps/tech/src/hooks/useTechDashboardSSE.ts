"use client";

import { useEffect, useRef } from "react";
import { API_URL } from "@/lib/api/client";

const SSE_SUPPORTED = typeof EventSource !== "undefined";

export function useTechDashboardSSE(
  companyId: string | null | undefined,
  onInvalidate: () => void
) {
  const cbRef = useRef(onInvalidate);
  cbRef.current = onInvalidate;

  useEffect(() => {
    if (!companyId || !SSE_SUPPORTED) return;

    const url = `${API_URL}/v1/events/metrics/${companyId}`;
    const es = new EventSource(url, { withCredentials: true });

    const handler = () => cbRef.current();
    es.addEventListener("tech:dashboard:invalidate", handler);

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.removeEventListener("tech:dashboard:invalidate", handler);
      es.close();
    };
  }, [companyId]);
}
