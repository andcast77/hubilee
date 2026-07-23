"use client";

import { Link } from "@/lib/next-nav";
import { WIZARD_ONBOARDING_PATHS } from "@/lib/auth/wizard-onboarding-path";

const labelClass = "text-sm font-medium text-slate-600";
const inputClass =
  "h-12 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#0085db]/25 focus-visible:border-[#0085db]";
const primaryBtnClass =
  "h-12 w-full rounded-xl bg-[#0085db] text-base font-semibold text-white shadow-sm shadow-[#0085db]/25 hover:bg-[#0074c2] focus-visible:ring-[#0085db]";

export const wizardFormStyles = { labelClass, inputClass, primaryBtnClass };

const STEPS = [
  { key: "empresa", label: "Empresa", href: WIZARD_ONBOARDING_PATHS.EMPRESA },
  { key: "rubro", label: "Rubro", href: WIZARD_ONBOARDING_PATHS.RUBRO },
  { key: "local", label: "Local", href: WIZARD_ONBOARDING_PATHS.LOCAL },
] as const;

export type WizardStepKey = (typeof STEPS)[number]["key"];

function BrandMark() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2.5 rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#0085db]/40"
    >
      <img
        src="/logo/isotipo/pos-isotipo.svg"
        alt="Hubilee Pos"
        width={36}
        height={36}
        className="h-9 w-9"
      />
      <span className="text-lg font-bold tracking-tight text-slate-800">
        Hubilee <span className="text-[#0085db]">Pos</span>
      </span>
    </Link>
  );
}

function StepIndicator({ current }: { current: WizardStepKey }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="mb-6 flex flex-wrap gap-2" aria-label="Progreso del registro">
      {STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const baseClass = active
          ? "rounded-full bg-[#0085db]/12 px-2.5 py-0.5 text-xs font-semibold text-[#0085db]"
          : done
            ? "rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
            : "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-400";

        return (
          <li key={step.key}>
            {done ? (
              <Link
                to={step.href}
                className={`${baseClass} transition-colors hover:bg-emerald-100 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0085db]/40`}
                aria-label={`Volver a ${step.label}`}
              >
                {step.label}
              </Link>
            ) : (
              <span
                className={baseClass}
                aria-current={active ? "step" : undefined}
              >
                {step.label}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function WizardShell({
  step,
  title,
  subtitle,
  children,
}: {
  step: WizardStepKey;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb] text-slate-900">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-[#9fd4f7]/55 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-20 h-[480px] w-[480px] rounded-full bg-[#ffc49a]/50 blur-3xl"
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full rounded-[1.75rem] border border-slate-200/80 bg-white px-6 py-10 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)] sm:px-10">
          <div className="mb-8">
            <BrandMark />
          </div>

          <StepIndicator current={step} />

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
