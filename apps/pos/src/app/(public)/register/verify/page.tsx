import { Suspense } from "react";
import { RegisterVerifyPage } from "@/views/RegisterVerifyPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RegisterVerifyPage />
    </Suspense>
  );
}
