"use client";

import { useState } from "react";
import { Link, useNavigate } from "@/lib/next-nav";
import { ApiError } from "@hubilee/shared";
import type { ApiResponse } from "@hubilee/contracts";
import { Button, Input, Label } from "@hubilee/ui";
import { OtpCodeInput } from "@/components/auth/OtpCodeInput";
import { authApi } from "@/lib/api/client";
import { RegistrationTurnstile } from "@/components/auth/RegistrationTurnstile";
import {
  clearPasswordResetTicket,
  storePasswordResetTicket,
} from "@/lib/password-reset-ticket";
import { toast } from "sonner";

const TOAST_MS = 4000;
const labelClass = "text-sm font-medium text-slate-600";
const inputClass =
  "h-12 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#0085db]/25 focus-visible:border-[#0085db]";
const primaryBtnClass =
  "h-12 w-full rounded-xl bg-[#0085db] text-base font-semibold text-white shadow-sm shadow-[#0085db]/25 hover:bg-[#0074c2]";

type Step = "email" | "otp";

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

function ForgotVisualPanel() {
  return (
    <div className="relative hidden h-full min-h-[520px] overflow-hidden rounded-l-[1.75rem] bg-gradient-to-br from-[#e8f4fc] via-[#f0f7ff] to-[#fff4eb] lg:block">
      <div
        aria-hidden
        className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[#7ec8f5]/50 blur-2xl animate-[pos-blob_12s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-[#ffb07a]/45 blur-2xl animate-[pos-blob_14s_ease-in-out_infinite_reverse]"
      />
      <div className="relative z-10 flex h-full min-h-[520px] flex-col justify-between p-10">
        <BrandMark
          imgClassName="h-9 w-9"
          textClassName="text-lg font-bold tracking-tight text-slate-800"
        />

        <div className="mx-auto w-full max-w-[280px] animate-[pos-float_6s_ease-in-out_infinite]">
          <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-xl shadow-slate-900/10 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Recuperación
              </span>
              <span className="rounded-full bg-[#0085db]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0085db]">
                Código OTP
              </span>
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-900">3 pasos</p>
            <p className="mt-1 text-sm text-slate-500">Volvé a acceder sin fricción</p>
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">1. Email</span>
                <span className="font-medium text-slate-900">Enviar</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">2. Código</span>
                <span className="font-medium text-slate-900">Verificar</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#0085db]/8 px-3 py-2 text-sm">
                <span className="text-[#0085db]">3. Nueva clave</span>
                <span className="font-semibold text-[#0085db]">→</span>
              </div>
            </div>
          </div>
        </div>

        <p className="max-w-[240px] text-sm leading-relaxed text-slate-600">
          Recuperá el acceso a tu caja y seguí operando la tienda.
        </p>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) {
      toast.error("Email inválido", { duration: TOAST_MS });
      return;
    }
    setIsLoading(true);
    try {
      const body: { email: string; captchaToken?: string } = { email: normalized };
      if (captchaToken?.trim()) body.captchaToken = captchaToken.trim();
      await authApi.post("/password-reset/otp/send", body);
      setEmail(normalized);
      setCode("");
      clearPasswordResetTicket();
      setStep("otp");
      toast.success("Te enviamos un código a tu email", { duration: TOAST_MS });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo enviar el código.", {
        duration: TOAST_MS,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error("Ingresá el código de 6 dígitos.", { duration: TOAST_MS });
      return;
    }
    setIsLoading(true);
    try {
      const verifyRes = await authApi.post<ApiResponse<{ resetTicket: string }>>(
        "/password-reset/otp/verify",
        { email, code: code.trim() },
      );
      const resetTicket = verifyRes.data?.resetTicket;
      if (!verifyRes.success || !resetTicket) {
        throw new Error(verifyRes.error || "Código inválido.");
      }
      storePasswordResetTicket(email, resetTicket);
      void navigate({
        to: "/reset-password",
        search: { email },
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Código inválido.",
        { duration: TOAST_MS },
      );
    } finally {
      setIsLoading(false);
    }
  }

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
          <ForgotVisualPanel />

          <div className="flex min-h-[520px] flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
            <div className="mb-8 lg:hidden">
              <BrandMark
                imgClassName="h-8 w-8"
                textClassName="text-lg font-bold tracking-tight text-slate-800"
              />
            </div>

            {step === "otp" ? (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Ingresá el código
                </h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  Enviamos un código a <strong className="text-slate-900">{email}</strong>.
                  Verificalo para continuar.
                </p>
                <form className="mt-8 space-y-6" onSubmit={(e) => void onVerifyCode(e)}>
                  <div>
                    <Label className={labelClass} htmlFor="forgot-otp">
                      Código de 6 dígitos
                    </Label>
                    <div className="mt-8">
                      <OtpCodeInput
                        id="forgot-otp"
                        value={code}
                        onChange={setCode}
                        disabled={isLoading}
                        autoFocus
                        aria-label="Código de 6 dígitos"
                      />
                    </div>
                  </div>
                  <Button type="submit" className={primaryBtnClass} disabled={isLoading}>
                    {isLoading ? "Verificando…" : "Verificar"}
                  </Button>
                </form>
                <p className="mt-8 text-center text-sm text-slate-500">
                  <button
                    type="button"
                    className="font-semibold text-[#0085db] hover:text-[#0074c2]"
                    onClick={() => {
                      setStep("email");
                      setCode("");
                      clearPasswordResetTicket();
                    }}
                  >
                    Usar otro email
                  </button>
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  ¿Olvidaste tu contraseña?
                </h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  Te enviaremos un código a tu email para restablecerla.
                </p>
                <form className="mt-8 space-y-4" onSubmit={(e) => void onSendCode(e)}>
                  <div className="space-y-2">
                    <Label className={labelClass}>Email</Label>
                    <Input
                      type="email"
                      className={inputClass}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@empresa.com"
                      autoComplete="email"
                    />
                  </div>
                  <RegistrationTurnstile onToken={setCaptchaToken} variant="compact" />
                  <Button type="submit" className={primaryBtnClass} disabled={isLoading}>
                    {isLoading ? "Enviando…" : "Enviar código"}
                  </Button>
                </form>
                <p className="mt-8 text-center text-sm text-slate-500">
                  <Link to="/login" className="font-semibold text-[#0085db] hover:text-[#0074c2]">
                    Volver al login
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
