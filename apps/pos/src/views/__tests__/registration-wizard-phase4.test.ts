import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  isOwnerRegistrationIncomplete,
  wizardStepToPath,
} from "@/lib/auth/wizard-onboarding-path";

const posRoot = join(__dirname, "../..");
const monorepoApps = join(__dirname, "../../../..");

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

  it("4.2 Rubro is metadata only — shared POS, no vertical checkout forks", () => {
    const rubroSrc = readFileSync(
      join(posRoot, "views/RubroOnboardingPage.tsx"),
      "utf8",
    );
    const localSrc = readFileSync(
      join(posRoot, "views/LocalOnboardingPage.tsx"),
      "utf8",
    );
    const shellSrc = readFileSync(
      join(posRoot, "components/auth/WizardShell.tsx"),
      "utf8",
    );

    expect(rubroSrc).toMatch(/funciona igual para todos/i);
    expect(rubroSrc).toMatch(/BusinessType/);
    // No per-rubro branching into alternate POS / checkout UIs
    expect(rubroSrc).not.toMatch(
      /if\s*\([^)]*businessType[^)]*\)\s*\{[\s\S]{0,200}(checkout|ShoppingCart|POSFloor)/i,
    );
    expect(localSrc).not.toMatch(/businessType/);
    expect(shellSrc).not.toMatch(/VERDULERIA|KIOSCO|ELECTRONICA/);

    // Sell / checkout surface must not fork on company businessType either.
    const floorCandidates = [
      join(posRoot, "views/POSPages.tsx"),
      join(posRoot, "components/features/pos"),
    ];
    for (const candidate of floorCandidates) {
      if (!existsSync(candidate)) continue;
      const st = readFileSync(
        // If directory, scan key checkout entrypoints only via POSPages + PaymentModal.
        candidate.endsWith(".tsx")
          ? candidate
          : join(candidate, "PaymentModal.tsx"),
        "utf8",
      );
      expect(st).not.toMatch(/\bbusinessType\b/);
      expect(st).not.toMatch(/VERDULERIA|KIOSCO|ELECTRONICA|ROPA|ACCESORIOS/);
    }
  });

  it("4.3 Hub and HR register UI exist and are outside this Pos-first change", () => {
    const hubRegister = join(monorepoApps, "hub/src/views/RegisterPage.tsx");
    const hrRegister = join(
      monorepoApps,
      "hr/src/components/forms/RegisterForm.tsx",
    );
    expect(existsSync(hubRegister)).toBe(true);
    expect(existsSync(hrRegister)).toBe(true);

    const hubSrc = readFileSync(hubRegister, "utf8");
    const hrSrc = readFileSync(hrRegister, "utf8");
    // Pos wizard paths / rubro stepper must not leak into Hub/HR register
    expect(hubSrc).not.toMatch(/onboarding\/rubro|registrationWizardStep|WizardShell/);
    expect(hrSrc).not.toMatch(/onboarding\/rubro|registrationWizardStep|WizardShell/);
    expect(hubSrc).not.toMatch(/businessType/);
    expect(hrSrc).not.toMatch(/businessType/);
  });

  it("4.3 Empresa step uses shared WizardShell (same chrome as Rubro/Local)", () => {
    const empresaSrc = readFileSync(
      join(posRoot, "views/CompanyOnboardingPage.tsx"),
      "utf8",
    );
    expect(empresaSrc).toMatch(/WizardShell/);
    expect(empresaSrc).toMatch(/step=\"empresa\"/);
    expect(empresaSrc).not.toMatch(/function OnboardingVisualPanel/);
  });
});
