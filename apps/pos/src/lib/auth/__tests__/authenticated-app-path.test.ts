import { describe, expect, it } from "vitest";
import type { MeResponse } from "@hubilee/contracts";
import {
  authenticatedAppPathFromMe,
  unwrapMeResponse,
} from "@/lib/auth/authenticated-app-path";

function me(partial: Partial<MeResponse> = {}): MeResponse {
  return {
    id: "u1",
    email: "a@b.com",
    role: "ADMIN",
    isActive: true,
    name: "Ada",
    ...partial,
  };
}

describe("authenticatedAppPathFromMe", () => {
  it("sends OWNER with incomplete company to Empresa step", () => {
    expect(
      authenticatedAppPathFromMe(
        me({ membershipRole: "OWNER", companyProfileComplete: false }),
      ),
    ).toBe("/app/onboarding/company");
  });

  it("resumes OWNER at Rubro when registrationWizardStep is RUBRO", () => {
    expect(
      authenticatedAppPathFromMe(
        me({
          membershipRole: "OWNER",
          companyProfileComplete: false,
          companyId: "c1",
          registrationWizardStep: "RUBRO",
        }),
      ),
    ).toBe("/app/onboarding/rubro");
  });

  it("resumes OWNER at Local when registrationWizardStep is LOCAL", () => {
    expect(
      authenticatedAppPathFromMe(
        me({
          membershipRole: "OWNER",
          companyProfileComplete: false,
          companyId: "c1",
          registrationWizardStep: "LOCAL",
        }),
      ),
    ).toBe("/app/onboarding/local");
  });

  it("does not send ADMIN to wizard even when incomplete flags set", () => {
    expect(
      authenticatedAppPathFromMe(
        me({
          membershipRole: "ADMIN",
          companyProfileComplete: false,
          registrationWizardStep: "EMPRESA",
        }),
        "/app/dashboard",
      ),
    ).toBe("/app/dashboard");
  });

  it("uses safe next path when present", () => {
    expect(authenticatedAppPathFromMe(me(), "/app/pos")).toBe("/app/pos");
  });

  it("rejects unsafe next and falls back to dashboard", () => {
    expect(authenticatedAppPathFromMe(me(), "https://evil.test")).toBe(
      "/app/dashboard",
    );
  });
});

describe("unwrapMeResponse", () => {
  it("unwraps success envelope", () => {
    const data = me({ id: "x" });
    expect(unwrapMeResponse({ success: true, data })).toEqual(data);
  });

  it("returns null on failed envelope", () => {
    expect(unwrapMeResponse({ success: false })).toBeNull();
  });
});
