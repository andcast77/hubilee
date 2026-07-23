import { Suspense } from "react";
import { ResetPasswordPage } from "@/views/ResetPasswordPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPage />
    </Suspense>
  );
}
