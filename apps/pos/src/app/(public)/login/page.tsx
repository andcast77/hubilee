import { Suspense } from "react";
import { LoginPage } from "@/views/LoginPage";

// `LoginPage` now uses `@tanstack/react-router` (PR3 route-tree migration),
// which requires a `<RouterProvider>` context only present in the
// Vite/TanStack app. Force dynamic rendering so `next build` keeps
// succeeding instead of crashing during static generation.
export const dynamic = "force-dynamic";

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-white/60">
      Cargando…
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPage />
    </Suspense>
  );
}
