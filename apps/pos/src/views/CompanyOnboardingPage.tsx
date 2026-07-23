"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/next-nav";
import { Button, Input, Label } from "@hubilee/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/useUser";
import { companiesApi } from "@/lib/api/client";
import { toast } from "sonner";

const TOAST_MS = 4000;

// --- Style tokens (mirror LoginPage / RegisterPage) ---

const labelClass = "text-sm font-medium text-slate-600";
const inputClass =
  "h-12 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#0085db]/25 focus-visible:border-[#0085db]";
const primaryBtnClass =
  "h-12 w-full rounded-xl bg-[#0085db] text-base font-semibold text-white shadow-sm shadow-[#0085db]/25 hover:bg-[#0074c2] focus-visible:ring-[#0085db]";

// --- Inline BrandMark ---

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

// --- Onboarding-themed visual panel ---

function OnboardingVisualPanel() {
  return (
    <div className="relative hidden h-full min-h-[420px] overflow-hidden rounded-l-[1.75rem] bg-gradient-to-br from-[#e8f4fc] via-[#f0f7ff] to-[#fff4eb] lg:block">
      <div
        aria-hidden
        className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[#7ec8f5]/50 blur-2xl animate-[pos-blob_12s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-[#ffb07a]/45 blur-2xl animate-[pos-blob_14s_ease-in-out_infinite_reverse]"
      />
      <div className="relative z-10 flex h-full flex-col justify-between p-10">
        <BrandMark
          imgClassName="h-9 w-9"
          textClassName="text-lg font-bold tracking-tight text-slate-800"
        />

        <div className="mx-auto w-full max-w-[280px] animate-[pos-float_6s_ease-in-out_infinite]">
          <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-xl shadow-slate-900/10 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Perfil fiscal
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                Pendiente
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">RFC / CUIT</span>
                <span className="font-medium text-slate-900">—</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">Razón social</span>
                <span className="font-medium text-slate-900">—</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#0085db]/8 px-3 py-2 text-sm">
                <span className="text-[#0085db]">Empezar a operar</span>
                <span className="font-semibold text-[#0085db]">→</span>
              </div>
            </div>
          </div>
        </div>

        <p className="max-w-[240px] text-sm leading-relaxed text-slate-600">
          Completá los datos fiscales para habilitar el punto de venta.
        </p>
      </div>
    </div>
  );
}

// --- Form types ---

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

// ============================================================
// Main component
// ============================================================

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
        setForm((prev) => ({
          name: (c.name ?? prev.name ?? "").trim() || prev.name,
          taxId: c.taxId?.trim() ?? prev.taxId,
          address: c.address?.trim() ?? prev.address,
          phone: c.phone?.trim() ?? prev.phone,
          logo: c.logo?.trim() ?? prev.logo,
        }));
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
      toast.error("No se encontró la empresa. Volvé a iniciar sesión.", { duration: TOAST_MS });
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

      const res = await companiesApi.update<{ success: boolean }>(
        companyId,
        body,
      );

      if (!res.success) {
        toast.error("No se pudo guardar. Intentá de nuevo.", { duration: TOAST_MS });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Datos guardados correctamente", { duration: TOAST_MS });

      setTimeout(() => {
        navigate({ to: "/app/onboarding/rubro", replace: true });
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
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb] text-slate-900">
      {/* Background blobs */}
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
          <OnboardingVisualPanel />

          <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
            <div className="mb-8 lg:hidden">
              <BrandMark
                imgClassName="h-8 w-8"
                textClassName="text-lg font-bold tracking-tight text-slate-800"
              />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Completá los datos de tu empresa
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Necesitamos el nombre fiscal y el RFC / CUIT para habilitar el
              punto de venta.
            </p>

            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="mt-8 space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="co-name" className={labelClass}>
                  Nombre de la empresa <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="co-name"
                  className={inputClass}
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ej: Acme Corp S.A."
                  aria-label="Nombre de la empresa"
                  disabled={isPrefilling}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="co-taxId" className={labelClass}>
                  RFC / CUIT <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="co-taxId"
                  className={inputClass}
                  value={form.taxId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, taxId: e.target.value }))
                  }
                  placeholder="Ej: ABC-123456-XYZ"
                  aria-label="RFC / CUIT"
                  disabled={isPrefilling}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="co-address" className={labelClass}>
                  Dirección
                </Label>
                <Input
                  id="co-address"
                  className={inputClass}
                  value={form.address}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="Opcional"
                  aria-label="Dirección"
                  disabled={isPrefilling}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="co-phone" className={labelClass}>
                  Teléfono
                </Label>
                <Input
                  id="co-phone"
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="Opcional"
                  aria-label="Teléfono"
                  disabled={isPrefilling}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="co-logo" className={labelClass}>
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
                    <span className={inputClass + " flex items-center justify-center text-sm text-slate-500"}>
                      {form.logo ? "Cambiar imagen" : "Seleccionar archivo"}
                    </span>
                    <input
                      id="co-logo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="sr-only"
                      disabled={isSubmitting || isPrefilling}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error("La imagen no debe superar los 2 MB", { duration: TOAST_MS });
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
                <p className="text-xs text-slate-400">
                  PNG, JPG, WebP o SVG · Máx 2 MB
                </p>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || isPrefilling}
                className={primaryBtnClass}
              >
                {isSubmitting ? "Guardando…" : "Guardar y continuar"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
