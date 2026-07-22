import { redirect } from "next/navigation";

/** PWA start_url `/app/` → dashboard. */
export default function AppIndexPage() {
  redirect("/app/dashboard");
}
