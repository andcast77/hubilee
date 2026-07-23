"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@/lib/next-nav";
import { ApiError } from "@hubilee/shared";
import type { ApiResponse, LoginResponse } from "@hubilee/contracts";
import { Button, Input, Label } from "@hubilee/ui";
import { authApi } from "@/lib/api/client";
import {
  clearPasswordResetTicket,
  readPasswordResetTicket,
} from "@/lib/password-reset-ticket";
import { toast } from "sonner";

const TOAST_MS = 4000;
const labelClass = "text-sm font-medium text-slate-600";
const inputClass =
  "h-12 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#0085db]/25 focus-visible:border-[#0085db]";
const primaryBtnClass =
  "h-12 w-full rounded-xl bg-[#0085db] text-base font-semibold text-white shadow-sm shadow-[#0085db]/25 hover:bg-[#0074c2]";

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

function ResetVisualPanel() {
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
                Nueva clave
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Seguro
              </span>
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-900">••••</p>
            <p className="mt-1 text-sm text-slate-500">Elegí tu nueva contraseña</p>
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">Código verificado</span>
                <span className="font-medium text-emerald-700">OK</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#0085db]/8 px-3 py-2 text-sm">
                <span className="text-[#0085db]">Restablecer</span>
                <span className="font-semibold text-[#0085db]">→</span>
              </div>
            </div>
          </div>
        </div>

        <p className="max-w-[240px] text-sm leading-relaxed text-slate-600">
          Elegí una contraseña nueva y volvé a tu punto de venta.
        </p>
      </div>
    </div>
  );
}

function postResetDestination(login: LoginResponse): string {
  const isOwnerIncomplete =
    login.membershipRole === "OWNER" && login.companyProfileComplete === false;
  return isOwnerIncomplete ? "/app/onboarding/company" : "/app/dashboard";
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { email?: string };
  const email = useMemo(
    () => (search.email ?? "").trim().toLowerCase(),
    [search.email],
  );
  const [resetTicket, setResetTicket] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const ticket = readPasswordResetTicket(email || undefined);
    if (!ticket || !email) {
      toast.error("Primero verificá el código desde recuperar contraseña.", {
        duration: TOAST_MS,
      });
      void navigate({ to: "/forgot-password", replace: true });
      return;
    }
    setResetTicket(ticket);
  }, [email, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !resetTicket) {
      toast.error("Sesión de recuperación inválida. Volvé a solicitar el código.", {
        duration: TOAST_MS,
      });
      void navigate({ to: "/forgot-password", replace: true });
      return;
    }
    if (newPassword.trim().length < 8) {
      toast.error("La contraseña nueva debe tener al menos 8 caracteres.", {
        duration: TOAST_MS,
      });
      return;
    }
    const password = newPassword.trim();
    setIsLoading(true);
    try {
      const resetRes = await authApi.post<ApiResponse<{ ok: boolean }>>("/password-reset", {
        email,
        resetTicket,
        newPassword: password,
      });
      if (!resetRes.success) {
        throw new Error(resetRes.error || "No se pudo restablecer la contraseña.");
      }
      clearPasswordResetTicket();

      const loginRes = await authApi.post<ApiResponse<LoginResponse>>("/login", {
        email,
        password,
      });
      if (!loginRes.success || !loginRes.data) {
        throw new Error(
          loginRes.error || "Contraseña actualizada, pero no se pudo iniciar sesión.",
        );
      }
      if (loginRes.data.mfaRequired && loginRes.data.tempToken) {
        toast.success("Contraseña actualizada. Completá la verificación en dos pasos.", {
          duration: TOAST_MS,
        });
        void navigate({
          to: "/login",
          search: { mfa: "1", tempToken: loginRes.data.tempToken },
          replace: true,
        });
        return;
      }

      toast.success("Contraseña actualizada. Ya estás dentro.", { duration: TOAST_MS });
      void navigate({ to: postResetDestination(loginRes.data), replace: true });
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

  if (!resetTicket) {
    return null;
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
          <ResetVisualPanel />

          <div className="flex min-h-[520px] flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
            <div className="mb-8 lg:hidden">
              <BrandMark
                imgClassName="h-8 w-8"
                textClassName="text-lg font-bold tracking-tight text-slate-800"
              />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Nueva contraseña
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Elegí una contraseña segura para {email}. Al guardarla vas a entrar
              automáticamente.
            </p>
            <form className="mt-8 space-y-6" onSubmit={(e) => void onSubmit(e)}>
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
                  autoFocus
                />
              </div>
              <Button type="submit" className={primaryBtnClass} disabled={isLoading}>
                {isLoading ? "Guardando…" : "Restablecer"}
              </Button>
            </form>
            <p className="mt-8 text-center text-sm text-slate-500">
              <Link
                to="/login"
                className="font-semibold text-[#0085db] hover:text-[#0074c2]"
                onClick={() => clearPasswordResetTicket()}
              >
                Volver al login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
