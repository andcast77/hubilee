"use client";

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "@/lib/next-nav";
import { useUser } from "@/hooks/useUser";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUser();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  // Capture the pathname the user actually tried to visit, once. `pathname`
  // is intentionally NOT a dependency below: `useLocation()` is reactive to
  // the router's global location store, so once the redirect below fires
  // and the location changes to `/login`, this same effect would otherwise
  // re-run with the now-stale `pathname` (`/login`) during the brief render
  // where this component is still mounted mid-transition, clobbering the
  // `next` search param with the wrong value.
  const initialPathnameRef = useRef(pathname);

  useEffect(() => {
    if (isLoading || user) return;
    void navigate({
      to: "/login",
      search: { next: initialPathnameRef.current || "/app/dashboard" },
      replace: true,
    });
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Redirigiendo al inicio de sesión…
      </div>
    );
  }

  return <>{children}</>;
}
