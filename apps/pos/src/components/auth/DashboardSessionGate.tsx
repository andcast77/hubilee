"use client";

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "@/lib/next-nav";
import { authApi } from "@/lib/api/client";

/**
 * Ensures user has API session before showing dashboard. httpOnly cookie is not visible to middleware.
 */
export function DashboardSessionGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const [ready, setReady] = useState(false);
  // Captured once: see `ProtectedRoute.tsx` for why `pathname` must not be a
  // reactive effect dependency here (it would re-run this effect — and
  // re-hit `/me` — after the redirect below changes the location, clobbering
  // the `next` search param with the post-redirect pathname).
  const initialPathnameRef = useRef(pathname);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await authApi.get("/me");
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled)
          void navigate({
            to: "/login",
            search: { next: initialPathnameRef.current || "/app/dashboard" },
            replace: true,
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Verificando sesión…
      </div>
    );
  }
  return <>{children}</>;
}
