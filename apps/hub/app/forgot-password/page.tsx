import { ForgotPasswordPage } from "@/views/ForgotPasswordPage";
import { AUTH_NOINDEX_METADATA } from "@/lib/seo";

export const metadata = AUTH_NOINDEX_METADATA;

export default function Page() {
  return <ForgotPasswordPage />;
}
