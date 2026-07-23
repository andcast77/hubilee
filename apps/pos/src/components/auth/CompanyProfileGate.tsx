"use client";

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "@/lib/next-nav";
import { useUser } from "@/hooks/useUser";

const ONBOARDING_PATH = "/app/onboarding/company";

/**
 * Hard-gates OWNER users who have an incomplete company fiscal profile.
 * Redirects to the company-onboarding wizard.
 * ADMIN and USER (floor) roles pass through regardless of completeness.
 */
export function CompanyProfileGate({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUser();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const initialPathnameRef = useRef(pathname);

  const isOwner = user?.membershipRole === "OWNER";
  const isIncomplete =
    user?.companyProfileComplete === false && !!user?.companyId;
  const alreadyOnOnboarding = initialPathnameRef.current === ONBOARDING_PATH;
  const mustRedirect =
    !isLoading && !!user && isOwner && isIncomplete && !alreadyOnOnboarding;

  useEffect(() => {
    if (!mustRedirect) return;
    void navigate({
      to: ONBOARDING_PATH,
      replace: true,
    });
  }, [mustRedirect, navigate]);

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
