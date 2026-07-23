"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardSessionGate } from "@/components/auth/DashboardSessionGate";
import { WizardResumeGate } from "@/components/auth/WizardResumeGate";

/**
 * Onboarding route group — ProtectedRoute + session + wizard resume.
 * No Sidebar / PosModuleGuard. CompanyProfileGate lives on the product layout only.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardSessionGate>
        <WizardResumeGate>
          <div className="flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
          </div>
        </WizardResumeGate>
      </DashboardSessionGate>
    </ProtectedRoute>
  );
}
