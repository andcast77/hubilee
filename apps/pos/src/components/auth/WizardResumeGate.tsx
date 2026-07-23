"use client";

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "@/lib/next-nav";
import { useUser } from "@/hooks/useUser";
import {
  resolveOwnerWizardRedirect,
  type WizardUserSignals,
} from "@/lib/auth/wizard-onboarding-path";

/**
 * Blocks skipping ahead past the first incomplete wizard step.
 * Allows revisiting completed steps. Complete OWNER on onboarding → dashboard.
 */
export function WizardResumeGate({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUser();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const pathname = useLocation({ select: (l) => l.pathname });

  const redirectTo =
    !isLoading && user
      ? resolveOwnerWizardRedirect(user as WizardUserSignals, pathname)
      : null;

  const completeOwnerOnOnboarding =
    !isLoading &&
    !!user &&
    user.membershipRole === "OWNER" &&
    user.companyProfileComplete === true &&
    !user.registrationWizardStep;

  useEffect(() => {
    if (redirectTo) {
      void navigateRef.current({ to: redirectTo, replace: true });
      return;
    }
    if (completeOwnerOnOnboarding) {
      void navigateRef.current({ to: "/app/dashboard", replace: true });
    }
  }, [redirectTo, completeOwnerOnOnboarding]);

  if (isLoading || redirectTo || completeOwnerOnOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
          <p className="mt-4 text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
