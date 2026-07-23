import { Suspense } from "react";
import { ForgotPasswordPage } from "@/views/ForgotPasswordPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordPage />
    </Suspense>
  );
}
