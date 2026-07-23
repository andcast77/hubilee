import type { MeResponse } from "@hubilee/contracts";
import { safeNextPath } from "@/lib/auth/googleOAuth";

/**
 * Where to send an already-authenticated user leaving login/register.
 * Mirrors post-login routing: OWNER with incomplete company → onboarding.
 */
export function authenticatedAppPathFromMe(
  me: MeResponse,
  next?: string | null,
): string {
  const isOwnerIncomplete =
    me.membershipRole === "OWNER" && me.companyProfileComplete === false;
  if (isOwnerIncomplete) return "/app/onboarding/company";
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
