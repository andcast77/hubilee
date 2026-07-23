"use client";

import { useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@/lib/next-nav";
import { ApiError } from "@hubilee/shared";
import type { ApiResponse } from "@hubilee/contracts";
import { Button, Input, Label } from "@hubilee/ui";
import { authApi } from "@/lib/api/client";
import { toast } from "sonner";

const TOAST_MS = 4000;
const labelClass = "text-sm font-medium text-slate-600";
const inputClass =
  "h-12 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#0085db]/25 focus-visible:border-[#0085db]";
const primaryBtnClass =
  "h-12 w-full rounded-xl bg-[#0085db] text-base font-semibold text-white shadow-sm shadow-[#0085db]/25 hover:bg-[#0074c2]";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { email?: string };
  const email = useMemo(
    () => (search.email ?? "").trim().toLowerCase(),
    [search.email],
  );
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Falta el email. Volvé a solicitar el código.", { duration: TOAST_MS });
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error("Ingresá el código de 6 dígitos.", { duration: TOAST_MS });
      return;
    }
    if (newPassword.trim().length < 8) {
      toast.error("La contraseña nueva debe tener al menos 8 caracteres.", {
        duration: TOAST_MS,
      });
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
      const resetRes = await authApi.post<ApiResponse<{ ok: boolean }>>("/password-reset", {
        email,
        resetTicket,
        newPassword: newPassword.trim(),
      });
      if (!resetRes.success) {
        throw new Error(resetRes.error || "No se pudo restablecer la contraseña.");
      }
      setDone(true);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo restablecer la contraseña.",
        { duration: TOAST_MS },
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f7fb] px-4 text-slate-900">
      <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200/80 bg-white p-8 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18)]">
        {done ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">Contraseña actualizada</h1>
            <p className="text-sm text-slate-500">Ya podés iniciar sesión con tu nueva contraseña.</p>
            <Button
              type="button"
              className={primaryBtnClass}
              onClick={() => void navigate({ to: "/login", replace: true })}
            >
              Ir al login
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Nueva contraseña</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {email
                ? `Código enviado a ${email}`
                : "Ingresá el código del correo y tu nueva contraseña."}
            </p>
            <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
              <div className="space-y-2">
                <Label className={labelClass} htmlFor="reset-otp">
                  Código
                </Label>
                <Input
                  id="reset-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className={inputClass}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  autoComplete="one-time-code"
                />
              </div>
              <div className="space-y-2">
                <Label className={labelClass} htmlFor="reset-new-password">
                  Nueva contraseña
                </Label>
                <Input
                  id="reset-new-password"
                  type="password"
                  className={inputClass}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className={primaryBtnClass} disabled={isLoading}>
                {isLoading ? "Guardando…" : "Restablecer contraseña"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-500">
              <Link to="/forgot-password" className="font-semibold text-[#0085db]">
                Solicitar otro código
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
