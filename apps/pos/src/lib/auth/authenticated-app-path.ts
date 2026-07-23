import type { MeResponse } from "@hubilee/contracts";
import { safeNextPath } from "@/lib/auth/googleOAuth";
import { wizardStepToPath } from "@/lib/auth/wizard-onboarding-path";

/**
 * Where to send an already-authenticated user leaving login/register.
 * Mirrors post-login routing: incomplete OWNER → first incomplete wizard step.
 */
export function authenticatedAppPathFromMe(
  me: MeResponse,
  next?: string | null,
): string {
  if (me.membershipRole === "OWNER") {
    if (me.registrationWizardStep) {
      return wizardStepToPath(me.registrationWizardStep);
    }
    if (me.companyProfileComplete === false) {
      return wizardStepToPath(undefined);
    }
  }
  return safeNextPath(next) ?? "/app/dashboard";
}

/** Unwrap `{ success, data }` envelope from GET /v1/auth/me when present. */
export function unwrapMeResponse(response: unknown): MeResponse | null {
  if (!response || typeof response !== "object") return null;
  if ("success" in response) {
    const env = response as { success: boolean; data?: MeResponse };
    if (!env.success || !env.data) return null;
    return env.data;
  }
  return response as MeResponse;
}
