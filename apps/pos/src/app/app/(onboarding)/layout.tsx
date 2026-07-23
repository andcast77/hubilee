"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardSessionGate } from "@/components/auth/DashboardSessionGate";

/**
 * Onboarding route group — ProtectedRoute + DashboardSessionGate only.
 * No Sidebar, no PosModuleGuard, no CompanyContextBootstrap.
 * The CompanyProfileGate redirects here for OWNER with incomplete profile,
 * so the gate itself must not wrap this layout (that would cause an infinite loop).
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardSessionGate>
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
        </div>
      </DashboardSessionGate>
    </ProtectedRoute>
  );
}
