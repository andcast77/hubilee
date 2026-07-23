/**
 * POS OWNER registration wizard resume paths.
 * Steps: Cuenta (auth) → Empresa → Rubro → Local (server auto-caja).
 */

export type RegistrationWizardStep = "CUENTA" | "EMPRESA" | "RUBRO" | "LOCAL";

export const WIZARD_ONBOARDING_PATHS = {
  EMPRESA: "/app/onboarding/company",
  RUBRO: "/app/onboarding/rubro",
  LOCAL: "/app/onboarding/local",
} as const;

export type WizardUserSignals = {
  membershipRole?: string | null;
  companyId?: string | null;
  companyProfileComplete?: boolean;
  registrationWizardComplete?: boolean;
  registrationWizardStep?: RegistrationWizardStep | null;
};

/** Map first-incomplete wizard step → onboarding route. */
export function wizardStepToPath(
  step: RegistrationWizardStep | null | undefined,
): string {
  if (step === "RUBRO") return WIZARD_ONBOARDING_PATHS.RUBRO;
  if (step === "LOCAL") return WIZARD_ONBOARDING_PATHS.LOCAL;
  // EMPRESA, CUENTA, or unknown → first post-account step
  return WIZARD_ONBOARDING_PATHS.EMPRESA;
}

export function isWizardOnboardingPath(pathname: string): boolean {
  return (
    pathname === WIZARD_ONBOARDING_PATHS.EMPRESA ||
    pathname === WIZARD_ONBOARDING_PATHS.RUBRO ||
    pathname === WIZARD_ONBOARDING_PATHS.LOCAL ||
    pathname.startsWith("/app/onboarding/")
  );
}

/**
 * OWNER with a company who has not finished the registration wizard.
 * `companyProfileComplete` is the server wizard-complete flag (repurposed).
 */
export function isOwnerRegistrationIncomplete(user: WizardUserSignals): boolean {
  if (user.membershipRole !== "OWNER" || !user.companyId) return false;
  if (user.registrationWizardComplete === true) return false;
  if (user.companyProfileComplete === true && !user.registrationWizardStep) {
    return false;
  }
  if (user.registrationWizardStep) return true;
  if (user.companyProfileComplete === false) return true;
  if (user.registrationWizardComplete === false) return true;
  return false;
}

/** Index among Empresa → Rubro → Local (Cuenta has no onboarding route). */
function firstIncompleteStepIndex(
  step: RegistrationWizardStep | null | undefined,
): number {
  if (step === "RUBRO") return 1;
  if (step === "LOCAL") return 2;
  return 0; // EMPRESA, CUENTA, or unknown
}

function onboardingPathStepIndex(pathname: string): number | null {
  if (pathname === WIZARD_ONBOARDING_PATHS.EMPRESA) return 0;
  if (pathname === WIZARD_ONBOARDING_PATHS.RUBRO) return 1;
  if (pathname === WIZARD_ONBOARDING_PATHS.LOCAL) return 2;
  return null;
}

/**
 * Where an incomplete OWNER must go from `pathname`, or null if already allowed.
 * Blocks skipping ahead to incomplete steps; allows revisiting completed ones.
 */
export function resolveOwnerWizardRedirect(
  user: WizardUserSignals,
  pathname: string,
): string | null {
  if (!isOwnerRegistrationIncomplete(user)) return null;
  const target = wizardStepToPath(user.registrationWizardStep);
  const pathIdx = onboardingPathStepIndex(pathname);
  const maxIdx = firstIncompleteStepIndex(user.registrationWizardStep);
  // Current incomplete step or any completed earlier step.
  if (pathIdx !== null && pathIdx <= maxIdx) return null;
  if (pathname === target) return null;
  return target;
}
