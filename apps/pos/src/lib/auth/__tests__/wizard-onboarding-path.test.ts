import { describe, expect, it } from "vitest";
import {
  isOwnerRegistrationIncomplete,
  isWizardOnboardingPath,
  resolveOwnerWizardRedirect,
  wizardStepToPath,
} from "@/lib/auth/wizard-onboarding-path";

describe("wizardStepToPath", () => {
  it("maps EMPRESA to company onboarding", () => {
    expect(wizardStepToPath("EMPRESA")).toBe("/app/onboarding/company");
  });

  it("maps RUBRO to rubro onboarding", () => {
    expect(wizardStepToPath("RUBRO")).toBe("/app/onboarding/rubro");
  });

  it("maps LOCAL to local onboarding", () => {
    expect(wizardStepToPath("LOCAL")).toBe("/app/onboarding/local");
  });

  it("maps CUENTA / null to Empresa (first post-account step)", () => {
    expect(wizardStepToPath("CUENTA")).toBe("/app/onboarding/company");
    expect(wizardStepToPath(null)).toBe("/app/onboarding/company");
    expect(wizardStepToPath(undefined)).toBe("/app/onboarding/company");
  });
});

describe("isWizardOnboardingPath", () => {
  it("recognizes stepper paths", () => {
    expect(isWizardOnboardingPath("/app/onboarding/company")).toBe(true);
    expect(isWizardOnboardingPath("/app/onboarding/rubro")).toBe(true);
    expect(isWizardOnboardingPath("/app/onboarding/local")).toBe(true);
  });

  it("rejects product routes", () => {
    expect(isWizardOnboardingPath("/app/dashboard")).toBe(false);
    expect(isWizardOnboardingPath("/app/pos")).toBe(false);
  });
});

describe("isOwnerRegistrationIncomplete", () => {
  it("is true for OWNER with registrationWizardStep", () => {
    expect(
      isOwnerRegistrationIncomplete({
        membershipRole: "OWNER",
        companyId: "c1",
        registrationWizardStep: "RUBRO",
      }),
    ).toBe(true);
  });

  it("is true for OWNER with companyProfileComplete false", () => {
    expect(
      isOwnerRegistrationIncomplete({
        membershipRole: "OWNER",
        companyId: "c1",
        companyProfileComplete: false,
      }),
    ).toBe(true);
  });

  it("is false for complete OWNER", () => {
    expect(
      isOwnerRegistrationIncomplete({
        membershipRole: "OWNER",
        companyId: "c1",
        companyProfileComplete: true,
      }),
    ).toBe(false);
  });

  it("is false for ADMIN / floor even when incomplete flags set", () => {
    expect(
      isOwnerRegistrationIncomplete({
        membershipRole: "ADMIN",
        companyId: "c1",
        companyProfileComplete: false,
        registrationWizardStep: "EMPRESA",
      }),
    ).toBe(false);
    expect(
      isOwnerRegistrationIncomplete({
        membershipRole: "USER",
        companyId: "c1",
        companyProfileComplete: false,
      }),
    ).toBe(false);
  });

  it("is false without companyId", () => {
    expect(
      isOwnerRegistrationIncomplete({
        membershipRole: "OWNER",
        companyProfileComplete: false,
        registrationWizardStep: "EMPRESA",
      }),
    ).toBe(false);
  });
});

describe("resolveOwnerWizardRedirect", () => {
  it("redirects incomplete OWNER on product route to step path", () => {
    expect(
      resolveOwnerWizardRedirect(
        {
          membershipRole: "OWNER",
          companyId: "c1",
          registrationWizardStep: "LOCAL",
          companyProfileComplete: false,
        },
        "/app/dashboard",
      ),
    ).toBe("/app/onboarding/local");
  });

  it("redirects when skipping ahead to an incomplete step", () => {
    expect(
      resolveOwnerWizardRedirect(
        {
          membershipRole: "OWNER",
          companyId: "c1",
          registrationWizardStep: "EMPRESA",
          companyProfileComplete: false,
        },
        "/app/onboarding/rubro",
      ),
    ).toBe("/app/onboarding/company");
  });

  it("allows revisiting a completed earlier step", () => {
    expect(
      resolveOwnerWizardRedirect(
        {
          membershipRole: "OWNER",
          companyId: "c1",
          registrationWizardStep: "LOCAL",
          companyProfileComplete: false,
        },
        "/app/onboarding/company",
      ),
    ).toBeNull();
    expect(
      resolveOwnerWizardRedirect(
        {
          membershipRole: "OWNER",
          companyId: "c1",
          registrationWizardStep: "LOCAL",
          companyProfileComplete: false,
        },
        "/app/onboarding/rubro",
      ),
    ).toBeNull();
  });

  it("returns null when already on the resume step", () => {
    expect(
      resolveOwnerWizardRedirect(
        {
          membershipRole: "OWNER",
          companyId: "c1",
          registrationWizardStep: "RUBRO",
          companyProfileComplete: false,
        },
        "/app/onboarding/rubro",
      ),
    ).toBeNull();
  });

  it("returns null for non-OWNER", () => {
    expect(
      resolveOwnerWizardRedirect(
        {
          membershipRole: "ADMIN",
          companyId: "c1",
          registrationWizardStep: "EMPRESA",
          companyProfileComplete: false,
        },
        "/app/dashboard",
      ),
    ).toBeNull();
  });
});
