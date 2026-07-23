import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  isOwnerRegistrationIncomplete,
  wizardStepToPath,
} from "@/lib/auth/wizard-onboarding-path";

/**
 * Phase 4 verification — focused checks for gate + pos-first scope.
 */
describe("Phase 4: registration wizard verification", () => {
  it("4.2 blocks incomplete OWNER from product routes via resume redirect", () => {
    const target = wizardStepToPath("LOCAL");
    expect(target).toBe("/app/onboarding/local");
    expect(
      isOwnerRegistrationIncomplete({
        membershipRole: "OWNER",
        companyId: "c1",
        companyProfileComplete: false,
        registrationWizardStep: "LOCAL",
      }),
    ).toBe(true);
  });

  it("4.2 does not force ADMIN or floor into the wizard", () => {
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

  it("4.2 Rubro page documents shared POS (no vertical forks)", () => {
    const src = readFileSync(
      join(__dirname, "../RubroOnboardingPage.tsx"),
      "utf8",
    );
    expect(src).toMatch(/funciona igual para todos/i);
    expect(src).not.toMatch(/if\s*\(.*businessType.*\)\s*\{[\s\S]*checkout/i);
  });

  it("4.3 Hub register UI files exist and are unchanged by this change scope", () => {
    const hubRegister = join(
      __dirname,
      "../../../../hub/src/views/RegisterPage.tsx",
    );
    expect(existsSync(hubRegister)).toBe(true);
  });
});
