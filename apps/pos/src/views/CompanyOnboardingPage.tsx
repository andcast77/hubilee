"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/next-nav";
import { Button, Input, Label } from "@hubilee/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/useUser";
import { companiesApi } from "@/lib/api/client";
import { WIZARD_ONBOARDING_PATHS } from "@/lib/auth/wizard-onboarding-path";
import {
  WizardShell,
  wizardFormStyles,
} from "@/components/auth/WizardShell";
import { toast } from "sonner";

const TOAST_MS = 4000;

type FormData = {
  name: string;
  taxId: string;
  address: string;
  phone: string;
  logo: string;
};

type CompanyProfilePayload = {
  name?: string | null;
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
  logo?: string | null;
};

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "El nombre de la empresa es obligatorio";
  if (trimmed.toLowerCase() === "mi empresa") return "Ingresá un nombre de empresa válido";
  return null;
}

function validateTaxId(taxId: string): string | null {
  if (!taxId.trim()) return "El RFC / CUIT es obligatorio";
  return null;
}

export function CompanyOnboardingPage() {
  const navigate = useNavigate();
  const { data: user } = useUser();
  const [form, setForm] = useState<FormData>({
    name: user?.company?.name ?? "",
    taxId: "",
    address: "",
    phone: "",
    logo: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const companyId = user?.companyId;

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    async function loadCompany() {
      setIsPrefilling(true);
      try {
        const res = await companiesApi.get<{
          success: boolean;
          data?: CompanyProfilePayload;
        }>(companyId!);
        if (cancelled || !res.success || !res.data) return;
        const c = res.data;
        const logo = c.logo?.trim() ?? "";
        setForm((prev) => ({
          name: (c.name ?? prev.name ?? "").trim() || prev.name,
          taxId: c.taxId?.trim() ?? prev.taxId,
          address: c.address?.trim() ?? prev.address,
          phone: c.phone?.trim() ?? prev.phone,
          logo: logo || prev.logo,
        }));
        if (logo) setLogoPreview(logo);
      } catch {
        // Prefill is best-effort; wizard remains usable with empty fields.
      } finally {
        if (!cancelled) setIsPrefilling(false);
      }
    }

    void loadCompany();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nameError = validateName(form.name);
    if (nameError) {
      toast.error(nameError, { duration: TOAST_MS });
      return;
    }

    const taxIdError = validateTaxId(form.taxId);
    if (taxIdError) {
      toast.error(taxIdError, { duration: TOAST_MS });
      return;
    }

    if (!companyId) {
      toast.error("No se encontró la empresa. Volvé a iniciar sesión.", {
        duration: TOAST_MS,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        taxId: form.taxId.trim(),
      };
      if (form.address.trim()) body.address = form.address.trim();
      if (form.phone.trim()) body.phone = form.phone.trim();
      if (form.logo.trim()) body.logo = form.logo.trim();

      const res = await companiesApi.update<{ success: boolean }>(companyId, body);

      if (!res.success) {
        toast.error("No se pudo guardar. Intentá de nuevo.", { duration: TOAST_MS });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Datos guardados correctamente", { duration: TOAST_MS });

      setTimeout(() => {
        navigate({ to: WIZARD_ONBOARDING_PATHS.RUBRO, replace: true });
      }, 300);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al guardar los datos",
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
      step="empresa"
      title="Completá los datos de tu empresa"
      subtitle="Necesitamos el nombre fiscal y el RFC / CUIT para habilitar el punto de venta."
      blurb="Completá los datos fiscales para habilitar el punto de venta."
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="co-name" className={wizardFormStyles.labelClass}>
            Nombre de la empresa <span className="text-red-500">*</span>
          </Label>
          <Input
            id="co-name"
            className={wizardFormStyles.inputClass}
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Ej: Acme Corp S.A."
            aria-label="Nombre de la empresa"
            disabled={isPrefilling}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="co-taxId" className={wizardFormStyles.labelClass}>
            RFC / CUIT <span className="text-red-500">*</span>
          </Label>
          <Input
            id="co-taxId"
            className={wizardFormStyles.inputClass}
            value={form.taxId}
            onChange={(e) => setForm((prev) => ({ ...prev, taxId: e.target.value }))}
            placeholder="Ej: ABC-123456-XYZ"
            aria-label="RFC / CUIT"
            disabled={isPrefilling}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="co-address" className={wizardFormStyles.labelClass}>
            Dirección
          </Label>
          <Input
            id="co-address"
            className={wizardFormStyles.inputClass}
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            placeholder="Opcional"
            aria-label="Dirección"
            disabled={isPrefilling}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="co-phone" className={wizardFormStyles.labelClass}>
            Teléfono
          </Label>
          <Input
            id="co-phone"
            className={wizardFormStyles.inputClass}
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="Opcional"
            aria-label="Teléfono"
            disabled={isPrefilling}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="co-logo" className={wizardFormStyles.labelClass}>
            Logo
          </Label>
          <div className="flex items-center gap-3">
            {logoPreview ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
                Sin logo
              </div>
            )}
            <label className="flex-1 cursor-pointer">
              <span
                className={
                  wizardFormStyles.inputClass +
                  " flex items-center justify-center text-sm text-slate-500"
                }
              >
                {form.logo ? "Cambiar imagen" : "Seleccionar archivo"}
              </span>
              <input
                id="co-logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="sr-only"
                aria-label="Logo"
                disabled={isSubmitting || isPrefilling}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    toast.error("La imagen no debe superar los 2 MB", {
                      duration: TOAST_MS,
                    });
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    const b64 = reader.result as string;
                    setForm((prev) => ({ ...prev, logo: b64 }));
                    setLogoPreview(b64);
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>
          <p className="text-xs text-slate-400">PNG, JPG, WebP o SVG · Máx 2 MB</p>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || isPrefilling}
          className={wizardFormStyles.primaryBtnClass}
        >
          {isSubmitting ? "Guardando…" : "Guardar y continuar"}
        </Button>
      </form>
    </WizardShell>
  );
}
