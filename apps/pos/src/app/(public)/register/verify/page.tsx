"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Magic-link register verify is retired on Pos (OTP-only).
 * Keep the URL so old emails redirect cleanly to /register.
 */
export default function RegisterVerifyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/register");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 text-slate-600">
      <p className="text-sm">El enlace de registro ya no aplica. Redirigiendo…</p>
    </main>
  );
}
