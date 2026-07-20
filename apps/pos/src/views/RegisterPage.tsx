"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ApiError } from "@hubilee/shared";
import {
  AuthLayout,
  AuthBrandDecorativePanel,
  AuthBrandWelcomeHeader,
  AuthBrandCard,
  AuthBrandErrorAlert,
  AuthBrandFooterCenter,
  AUTH_BRAND_INPUT_CLASS,
  AUTH_BRAND_LABEL_CLASS,
  AUTH_BRAND_PRIMARY_BUTTON_CLASS,
  AUTH_BRAND_OUTLINE_BUTTON_CLASS,
  Button,
  Input,
  Label,
} from "@hubilee/ui";
import { authApi } from "@/lib/api/client";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { RegistrationTurnstile } from "@/components/auth/RegistrationTurnstile";

type Step = "form" | "link-pending";

export function RegisterPage() {
  const [form, setForm] = useState<RegisterInput>({
    firstName: "",
    lastName: "",
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const decorativePanel = (
    <AuthBrandDecorativePanel
      badge="Pos"
      title="Tu punto de venta"
      description="Catálogo, ventas y stock con la misma cáscara de auth que el Hub: solo cambia el texto, no el layout."
      quote={<>De la vitrina a la caja, sin fricción.</>}
    />
  );

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Formulario inválido");
      return;
    }
    if (!form.termsAccepted) return;
    if (!captchaToken?.trim()) {
      setError("Completa la verificación anti-robots (captcha).");
      return;
    }
    setIsLoading(true);
    try {
      const d = parsed.data;
      await authApi.post("/register/link/send", {
        email: d.email.trim().toLowerCase(),
        captchaToken,
        verificationBaseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
        password: d.password,
        firstName: d.firstName.trim(),
        lastName: d.lastName.trim(),
        companyName: d.companyName.trim(),
        hrEnabled: false,
        posEnabled: true,
      });
      setStep("link-pending");
      setCaptchaToken(null);
      setTurnstileKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar el enlace.");
    } finally {
      setIsLoading(false);
    }
  }

  async function resendLink() {
    setError(null);
    setIsLoading(true);
    try {
      await authApi.post("/register/link/send", {
        email: form.email.trim().toLowerCase(),
        verificationBaseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        companyName: form.companyName.trim(),
        hrEnabled: false,
        posEnabled: true,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo reenviar el enlace.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout
      variant="brand"
      contentClassName="max-w-lg"
      panel={decorativePanel}
      className="pos-auth-shell pos-auth-layout"
    >
      <AuthBrandWelcomeHeader
        title="Crear cuenta"
        subtitle={
          step === "link-pending"
            ? "Abre el enlace en tu correo"
            : "Completa los datos para usar Pos"
        }
      />

      <AuthBrandCard
        cardTitle={step === "link-pending" ? "Revisa tu correo" : "Registrarse"}
        footer={
          <AuthBrandFooterCenter>
            <p className="text-sm text-white/50">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-indigo-300 hover:text-indigo-200 font-medium">
                Inicia sesión
              </Link>
            </p>
          </AuthBrandFooterCenter>
        }
      >
        {step === "link-pending" ? (
          <div className="space-y-4">
            {error ? (
              <AuthBrandErrorAlert variant="error">
                <p className="text-sm text-red-200">{error}</p>
              </AuthBrandErrorAlert>
            ) : null}
            <p className="text-sm text-white/70">
              Enlace enviado a <strong className="text-white">{form.email}</strong>
            </p>
            <p className="text-sm text-white/60">
              Abre el enlace del correo para crear tu cuenta. Puedes usar otro navegador o dispositivo.
            </p>
            <div className="space-y-3 pt-2">
              <p className="text-center text-xs text-white/45">¿No recibiste el correo?</p>
              <p className="text-center text-xs text-white/50">
                Máximo 3 correos con enlace por intento (incluido el primero). Luego espera o empieza de nuevo.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => void resendLink()}
                className={AUTH_BRAND_OUTLINE_BUTTON_CLASS}
              >
                {isLoading ? "Enviando…" : "Reenviar enlace"}
              </Button>
            </div>
          </div>
        ) : (
          <form className="flex flex-col gap-2" onSubmit={(e) => void sendLink(e)}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className={AUTH_BRAND_LABEL_CLASS}>Nombre</Label>
                <Input
                  className={AUTH_BRAND_INPUT_CLASS}
                  value={form.firstName}
                  onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className={AUTH_BRAND_LABEL_CLASS}>Apellido</Label>
                <Input
                  className={AUTH_BRAND_INPUT_CLASS}
                  value={form.lastName}
                  onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className={AUTH_BRAND_LABEL_CLASS}>Empresa</Label>
              <Input
                className={AUTH_BRAND_INPUT_CLASS}
                value={form.companyName}
                onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className={AUTH_BRAND_LABEL_CLASS}>Email</Label>
              <Input
                type="email"
                className={AUTH_BRAND_INPUT_CLASS}
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="tu@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label className={AUTH_BRAND_LABEL_CLASS}>Contraseña</Label>
              <Input
                type="password"
                className={AUTH_BRAND_INPUT_CLASS}
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label className={AUTH_BRAND_LABEL_CLASS}>Confirmar contraseña</Label>
              <Input
                type="password"
                className={AUTH_BRAND_INPUT_CLASS}
                value={form.confirmPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                className="accent-indigo-500"
                checked={form.termsAccepted}
                onChange={(e) => setForm((prev) => ({ ...prev, termsAccepted: e.target.checked }))}
              />
              Acepto los{" "}
              <Link className="text-indigo-300 underline hover:text-indigo-200" to="/terms">
                términos
              </Link>
            </label>
            {error ? (
              <AuthBrandErrorAlert variant="error">
                <p className="text-sm text-red-200">{error}</p>
              </AuthBrandErrorAlert>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <span className="sr-only">Verificación antispam antes de enviar el enlace.</span>
              <RegistrationTurnstile key={turnstileKey} onToken={setCaptchaToken} variant="compact" />
              <Button
                type="submit"
                className={AUTH_BRAND_PRIMARY_BUTTON_CLASS}
                disabled={isLoading || !form.termsAccepted}
              >
                {isLoading ? "Registrando…" : "Registrar empresa"}
              </Button>
            </div>
          </form>
        )}
      </AuthBrandCard>
    </AuthLayout>
  );
}
