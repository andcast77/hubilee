import { Suspense } from "react";
import { VerifyEmailPage } from "@/views/VerifyEmailPage";
import { AUTH_NOINDEX_METADATA } from "@/lib/seo";

export const metadata = AUTH_NOINDEX_METADATA;

function Fallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-slate-600">Cargando...</p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Fallback />}>
      <VerifyEmailPage />
    </Suspense>
  );
}
