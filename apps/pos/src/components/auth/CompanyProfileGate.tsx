"use client";

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "@/lib/next-nav";
import { useUser } from "@/hooks/useUser";
import {
  isWizardOnboardingPath,
  resolveOwnerWizardRedirect,
  type WizardUserSignals,
} from "@/lib/auth/wizard-onboarding-path";

/**
 * Hard-gates OWNER users who have not finished the registration wizard.
 * Redirects to the first incomplete step (Empresa / Rubro / Local).
 * ADMIN and USER (floor) roles pass through regardless of completeness.
 */
export function CompanyProfileGate({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUser();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const initialPathnameRef = useRef(pathname);

  const redirectTo =
    !isLoading && user
      ? resolveOwnerWizardRedirect(user as WizardUserSignals, initialPathnameRef.current)
      : null;

  // Onboarding group is outside this gate; still skip if somehow on a stepper path.
  const alreadyOnOnboarding = isWizardOnboardingPath(initialPathnameRef.current);
  const mustRedirect = !!redirectTo && !alreadyOnOnboarding;

  useEffect(() => {
    if (!mustRedirect || !redirectTo) return;
    void navigate({
      to: redirectTo,
      replace: true,
    });
  }, [mustRedirect, redirectTo, navigate]);

  // Withhold product UI while loading or while OWNER is incomplete (avoids flash).
  if (isLoading || mustRedirect) {
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
