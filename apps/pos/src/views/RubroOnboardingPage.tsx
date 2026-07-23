"use client";

import { useState } from "react";
import { Button } from "@hubilee/ui";
import { useQueryClient } from "@tanstack/react-query";
import type { BusinessType } from "@hubilee/contracts";
import { useNavigate } from "@/lib/next-nav";
import { useUser } from "@/hooks/useUser";
import { companiesApi } from "@/lib/api/client";
import { WIZARD_ONBOARDING_PATHS } from "@/lib/auth/wizard-onboarding-path";
import {
  WizardShell,
  wizardFormStyles,
} from "@/components/auth/WizardShell";
import { toast } from "sonner";

const TOAST_MS = 4000;

const RUBRO_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: "VERDULERIA", label: "Verdulería" },
  { value: "KIOSCO", label: "Kiosco" },
  { value: "ELECTRONICA", label: "Electrónica" },
  { value: "ROPA", label: "Ropa" },
  { value: "ACCESORIOS", label: "Accesorios" },
  { value: "OTRO", label: "Otro" },
];

export function RubroOnboardingPage() {
  const navigate = useNavigate();
  const { data: user } = useUser();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<BusinessType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const companyId = user?.companyId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      setError("Seleccioná un rubro para continuar");
      return;
    }
    if (!companyId) {
      toast.error("No se encontró la empresa. Volvé a iniciar sesión.", {
        duration: TOAST_MS,
      });
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await companiesApi.update<{ success: boolean }>(companyId, {
        businessType: selected,
      });
      if (!res.success) {
        toast.error("No se pudo guardar. Intentá de nuevo.", { duration: TOAST_MS });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Rubro guardado", { duration: TOAST_MS });
      setTimeout(() => {
        navigate({ to: WIZARD_ONBOARDING_PATHS.LOCAL, replace: true });
      }, 200);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al guardar el rubro",
        { duration: TOAST_MS },
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <WizardShell
      step="rubro"
      title="¿Cuál es el rubro de tu negocio?"
      subtitle="Usamos esto solo como referencia. El POS funciona igual para todos."
      blurb="Elegí el rubro que mejor describe tu negocio. No cambia el flujo de venta."
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <fieldset className="space-y-2">
          <legend className={wizardFormStyles.labelClass}>Rubro</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Rubro">
            {RUBRO_OPTIONS.map((opt) => {
              const checked = selected === opt.value;
              return (
                <label
                  key={opt.value}
                  className={
                    checked
                      ? "flex cursor-pointer items-center gap-3 rounded-xl border border-[#0085db] bg-[#0085db]/5 px-4 py-3 text-sm font-medium text-slate-900"
                      : "flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-slate-300"
                  }
                >
                  <input
                    type="radio"
                    name="businessType"
                    value={opt.value}
                    checked={checked}
                    onChange={() => {
                      setSelected(opt.value);
                      setError(null);
                    }}
                    className="sr-only"
                    aria-label={opt.label}
                  />
                  <span
                    aria-hidden
                    className={
                      checked
                        ? "flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#0085db]"
                        : "flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-300"
                    }
                  >
                    {checked ? (
                      <span className="h-2 w-2 rounded-full bg-[#0085db]" />
                    ) : null}
                  </span>
                  {opt.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting}
          className={wizardFormStyles.primaryBtnClass}
        >
          {isSubmitting ? "Guardando…" : "Guardar y continuar"}
        </Button>
      </form>
    </WizardShell>
  );
}
