"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useRegisterHubServiceWorker } from "@/hooks/useRegisterHubServiceWorker";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRegisterHubServiceWorker();
  return <DashboardLayout>{children}</DashboardLayout>;
}
