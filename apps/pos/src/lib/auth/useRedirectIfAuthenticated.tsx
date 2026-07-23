"use client";

import { useEffect, useRef, useState } from "react";
import { authApi } from "@/lib/api/client";
import { shouldCallMeForLoggedInCheck } from "@/lib/auth-session-probe";
import {
  authenticatedAppPathFromMe,
  unwrapMeResponse,
} from "@/lib/auth/authenticated-app-path";
import { useNavigate } from "@/lib/next-nav";

/**
 * Gate public auth pages: keep UI hidden until we know the visitor is a guest,
 * or kick off a replace-navigate when a session already exists (avoids login flash).
 */
export function useRedirectIfAuthenticated(options?: {
  next?: string | null;
  /** Skip probe (e.g. MFA challenge on login). */
  skip?: boolean;
}): { ready: boolean } {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const next = options?.next ?? null;
  const skip = options?.skip === true;
  const [ready, setReady] = useState(skip);

  useEffect(() => {
    if (skip) {
      setReady(true);
      return;
    }

    setReady(false);
    let cancelled = false;

    const checkAuth = async () => {
      try {
        if (!(await shouldCallMeForLoggedInCheck())) {
          if (!cancelled) setReady(true);
          return;
        }
        const raw = await authApi.meGuestProbe();
        const me = unwrapMeResponse(raw);
        if (cancelled) return;
        if (!me) {
          setReady(true);
          return;
        }
        void navigateRef.current({
          to: authenticatedAppPathFromMe(me, next),
          replace: true,
        });
        // Stay unready while navigation replaces the page.
      } catch {
        // Stale cookies after DB reset: clear API httpOnly jar once.
        const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
        void fetch(`${apiBase}/v1/auth/logout`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }).catch(() => {});
        if (!cancelled) setReady(true);
      }
    };

    void checkAuth();
    return () => {
      cancelled = true;
    };
    // Intentionally omit `navigate` — use navigateRef (unstable fn identity caused /me↔logout loops).
  }, [next, skip]);

  return { ready };
}

/** Neutral full-viewport placeholder matching the light auth shell. */
export function AuthSessionBootScreen() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#f5f7fb] text-slate-500"
      aria-busy="true"
      aria-label="Comprobando sesión"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#0085db]" />
    </div>
  );
}
