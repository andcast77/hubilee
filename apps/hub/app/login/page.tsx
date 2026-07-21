import { Suspense } from "react";
import { LoginPage } from "@/views/LoginPage";
import { AUTH_NOINDEX_METADATA } from "@/lib/seo";

export const metadata = AUTH_NOINDEX_METADATA;

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
        <p className="mt-4 text-slate-600">Cargando...</p>
      </div>
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
