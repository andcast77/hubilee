"use client";

import { useState } from "react";
import { Link, useNavigate } from "@/lib/next-nav";
import { ApiError } from "@hubilee/shared";
import { Button, Input, Label } from "@hubilee/ui";
import { authApi } from "@/lib/api/client";
import { RegistrationTurnstile } from "@/components/auth/RegistrationTurnstile";
import { toast } from "sonner";

const TOAST_MS = 4000;
const labelClass = "text-sm font-medium text-slate-600";
const inputClass =
  "h-12 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#0085db]/25 focus-visible:border-[#0085db]";
const primaryBtnClass =
  "h-12 w-full rounded-xl bg-[#0085db] text-base font-semibold text-white shadow-sm shadow-[#0085db]/25 hover:bg-[#0074c2]";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
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
      setSent(true);
      setEmail(normalized);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo enviar el código.", {
        duration: TOAST_MS,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f7fb] px-4 text-slate-900">
      <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200/80 bg-white p-8 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)]">
        {sent ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">Código enviado</h1>
            <p className="text-sm text-slate-500">
              Revisá tu correo <strong className="text-slate-900">{email}</strong> e ingresá el código
              para elegir una nueva contraseña.
            </p>
            <Button
              type="button"
              className={primaryBtnClass}
              onClick={() =>
                void navigate({
                  to: "/reset-password",
                  search: { email },
                })
              }
            >
              Continuar
            </Button>
            <Link to="/login" className="block text-center text-sm text-[#0085db]">
              Volver al login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">¿Olvidaste tu contraseña?</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Te enviaremos un código a tu email para restablecerla.
            </p>
            <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
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
            <p className="mt-6 text-center text-sm text-slate-500">
              <Link to="/login" className="font-semibold text-[#0085db]">
                Volver al login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
