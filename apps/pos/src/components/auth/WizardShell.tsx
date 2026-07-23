"use client";

import { Link } from "@/lib/next-nav";

const labelClass = "text-sm font-medium text-slate-600";
const inputClass =
  "h-12 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#0085db]/25 focus-visible:border-[#0085db]";
const primaryBtnClass =
  "h-12 w-full rounded-xl bg-[#0085db] text-base font-semibold text-white shadow-sm shadow-[#0085db]/25 hover:bg-[#0074c2] focus-visible:ring-[#0085db]";

export const wizardFormStyles = { labelClass, inputClass, primaryBtnClass };

const STEPS = [
  { key: "cuenta", label: "Cuenta" },
  { key: "empresa", label: "Empresa" },
  { key: "rubro", label: "Rubro" },
  { key: "local", label: "Local" },
] as const;

export type WizardStepKey = (typeof STEPS)[number]["key"];

function BrandMark({
  imgClassName,
  textClassName,
}: {
  imgClassName: string;
  textClassName: string;
}) {
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
        className={imgClassName}
      />
      <span className={textClassName}>
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
        return (
          <li
            key={step.key}
            className={
              active
                ? "rounded-full bg-[#0085db]/12 px-2.5 py-0.5 text-xs font-semibold text-[#0085db]"
                : done
                  ? "rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                  : "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-400"
            }
          >
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}

function WizardVisualPanel({ blurb }: { blurb: string }) {
  return (
    <div className="relative hidden h-full min-h-[420px] overflow-hidden rounded-l-[1.75rem] bg-gradient-to-br from-[#e8f4fc] via-[#f0f7ff] to-[#fff4eb] lg:block">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[#7ec8f5]/50 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-[#ffb07a]/45 blur-2xl"
      />
      <div className="relative z-10 flex h-full flex-col justify-between p-10">
        <BrandMark
          imgClassName="h-9 w-9"
          textClassName="text-lg font-bold tracking-tight text-slate-800"
        />
        <p className="max-w-[240px] text-sm leading-relaxed text-slate-600">{blurb}</p>
      </div>
    </div>
  );
}

export function WizardShell({
  step,
  title,
  subtitle,
  blurb,
  children,
}: {
  step: WizardStepKey;
  title: string;
  subtitle: string;
  blurb: string;
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

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)] lg:grid-cols-2">
          <WizardVisualPanel blurb={blurb} />

          <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
            <div className="mb-8 lg:hidden">
              <BrandMark
                imgClassName="h-8 w-8"
                textClassName="text-lg font-bold tracking-tight text-slate-800"
              />
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
    </div>
  );
}
