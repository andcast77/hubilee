"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Button,
  Input,
  Label,
} from "@hubilee/ui";
import { Link, useNavigate, useSearch } from "@/lib/next-nav";
import type { LoginResponse } from "@hubilee/contracts";
import {
  codeLoginSchema,
  shouldShowFloorTurnstile,
} from "@/lib/validations/auth";
import { authApi } from "@/lib/api/client";
import { getLandingUrls } from "@/lib/landingUrls";
import { RegistrationTurnstile } from "@/components/auth/RegistrationTurnstile";
import { safeNextPath, startGoogleOAuth } from "@/lib/auth/googleOAuth";
import { toast } from "sonner";

const TOAST_MS = 4000;

function notifyError(message: string) {
  toast.error(message, { duration: TOAST_MS });
}

function hubForgotPasswordUrl(): string {
  const base = getLandingUrls().hub.replace(/\/$/, "");
  return `${base}/forgot-password`;
}

const labelClass = "text-sm font-medium text-slate-600";
const inputClass =
  "h-12 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#0085db]/25 focus-visible:border-[#0085db]";
const primaryBtnClass =
  "h-12 w-full rounded-xl bg-[#0085db] text-base font-semibold text-white shadow-sm shadow-[#0085db]/25 hover:bg-[#0074c2] focus-visible:ring-[#0085db]";
const outlineBtnClass =
  "h-12 w-full rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

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

/** Left visual plane — product atmosphere, not a stock 3D collage. */
function LoginVisualPanel() {
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
                Caja abierta
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                En línea
              </span>
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-900">
              $12.480
            </p>
            <p className="mt-1 text-sm text-slate-500">Ventas de hoy</p>
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">Ticket #1042</span>
                <span className="font-medium text-slate-900">$890</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">Ticket #1041</span>
                <span className="font-medium text-slate-900">$1.250</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#0085db]/8 px-3 py-2 text-sm">
                <span className="text-[#0085db]">Nueva venta</span>
                <span className="font-semibold text-[#0085db]">→</span>
              </div>
            </div>
          </div>
        </div>

        <p className="max-w-[240px] text-sm leading-relaxed text-slate-600">
          Cobrá rápido, controlá inventario y operá la tienda desde un solo lugar.
        </p>
      </div>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    next?: string;
    mfa?: string;
    tempToken?: string;
    oauth_error?: string;
  };
  const nextPath = useMemo(
    () => safeNextPath(search.next ?? null),
    [search.next],
  );

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [codeFailCount, setCodeFailCount] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const [mfaStep, setMfaStep] = useState(false);
  const [mfaTempToken, setMfaTempToken] = useState<string | null>(null);
  const [mfaCompanyId, setMfaCompanyId] = useState<string | undefined>(
    undefined,
  );
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBackup, setMfaBackup] = useState(false);

  const showCodeTurnstile = shouldShowFloorTurnstile(codeFailCount);

  useEffect(() => {
    if (search.oauth_error) {
      notifyError("No se pudo iniciar sesión con Google. Intentá de nuevo.");
    }
    if (search.mfa === "1" && search.tempToken?.trim()) {
      setMfaStep(true);
      setMfaTempToken(search.tempToken.trim());
      setMfaCode("");
      setMfaBackup(false);
    }
  }, [search.mfa, search.tempToken, search.oauth_error]);

  function beginMfa(data: LoginResponse) {
    setMfaStep(true);
    setMfaTempToken(data.tempToken!);
    setMfaCompanyId(data.companyId);
    setMfaCode("");
    setMfaBackup(false);
  }

  async function handleCodeLoginSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = codeLoginSchema.safeParse({
      userCode: identifier,
      password,
      captchaToken: captchaToken ?? undefined,
    });
    if (!parsed.success) {
      notifyError(parsed.error.issues[0]?.message || "Datos inválidos");
      return;
    }
    if (showCodeTurnstile && !captchaToken) {
      notifyError("Completá la verificación de seguridad");
      return;
    }
    setIsLoading(true);
    try {
      const raw = identifier.trim();
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
      const body = isEmail
        ? { email: raw, password }
        : { userCode: raw, password };
      if (!isEmail && captchaToken) {
        (body as Record<string, unknown>).captchaToken = captchaToken;
      }

      const res = await authApi.post<{ success: boolean; data?: LoginResponse; error?: string }>(
        "/login",
        body,
      );
      if (!res.success || !res.data) {
        notifyError(res.error || "Credenciales inválidas");
        return;
      }
      if (res.data.mfaRequired && res.data.tempToken) {
        beginMfa(res.data);
        return;
      }
      setCodeFailCount(0);
      void navigate({ to: nextPath ?? "/dashboard", replace: true });
    } catch (err) {
      setCodeFailCount((n) => n + 1);
      setCaptchaToken(null);
      notifyError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoogleClick() {
    startGoogleOAuth({ intent: "login", next: nextPath });
  }

  async function handleMfaSubmit(e: FormEvent) {
    e.preventDefault();
    if (!mfaTempToken) {
      notifyError("Sesión MFA inválida. Volvé a iniciar sesión.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await authApi.post<{ success: boolean; data?: LoginResponse; error?: string }>("/mfa/verify", {
        tempToken: mfaTempToken,
        code: mfaCode,
        backup: mfaBackup,
        companyId: mfaCompanyId,
      });
      if (!res.success || !res.data) {
        notifyError(res.error || "Código inválido");
        return;
      }
      void navigate({ to: nextPath ?? "/dashboard", replace: true });
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "No se pudo verificar");
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
          <LoginVisualPanel />

          <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
            <div className="mb-8 lg:hidden">
              <BrandMark
                imgClassName="h-8 w-8"
                textClassName="text-lg font-bold tracking-tight text-slate-800"
              />
            </div>

            {mfaStep ? (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Verificación en dos pasos
                </h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  {mfaBackup
                    ? "Introduce un código de respaldo de un solo uso."
                    : "Introduce el código de tu app autenticadora."}
                </p>
                <form onSubmit={handleMfaSubmit} className="mt-8 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sf-mfa-code" className={labelClass}>
                      {mfaBackup ? "Código de respaldo" : "Código TOTP"}
                    </Label>
                    <Input
                      id="sf-mfa-code"
                      type="text"
                      inputMode={mfaBackup ? "text" : "numeric"}
                      value={mfaCode}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setMfaCode(e.target.value)
                      }
                      placeholder={mfaBackup ? "XXXX-XXXX-XXXX" : "000000"}
                      autoComplete="one-time-code"
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto px-0 text-[#0085db]"
                    onClick={() => {
                      setMfaBackup(!mfaBackup);
                      setMfaCode("");
                    }}
                  >
                    {mfaBackup
                      ? "Usar código de la app autenticadora"
                      : "Usar código de respaldo"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={primaryBtnClass}
                  >
                    {isLoading ? "Verificando…" : "Continuar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={outlineBtnClass}
                    onClick={() => {
                      setMfaStep(false);
                      setMfaTempToken(null);
                      setMfaCode("");
                    }}
                  >
                    Volver
                  </Button>
                </form>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Bienvenido a Pos
                </h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  Tu punto de venta, listo para operar
                </p>

                <form
                  onSubmit={handleCodeLoginSubmit}
                  className="mt-8 space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="sf-user-code" className={labelClass}>
                      Email o código de usuario
                    </Label>
                    <Input
                      id="sf-user-code"
                      type="text"
                      inputMode="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="tu@empresa.com o código"
                      autoComplete="username"
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="sf-code-password" className={labelClass}>
                        Contraseña
                      </Label>
                      <a
                        href={hubForgotPasswordUrl()}
                        className="text-xs font-medium text-[#0085db] hover:text-[#0074c2]"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        ¿Olvidaste tu contraseña?
                      </a>
                    </div>
                    <Input
                      id="sf-code-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </div>
                  {showCodeTurnstile ? (
                    <RegistrationTurnstile onToken={setCaptchaToken} />
                  ) : null}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={primaryBtnClass}
                  >
                    {isLoading ? "Iniciando sesión…" : "Iniciar sesión"}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div
                    aria-hidden
                    className="absolute inset-0 flex items-center"
                  >
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-slate-400">
                      o continuar con
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className={`${outlineBtnClass} gap-2.5`}
                    disabled={isLoading}
                    onClick={handleGoogleClick}
                  >
                    <GoogleMark className="h-4 w-4" />
                    Continuar con Google
                  </Button>
                </div>

                <p className="mt-8 text-center text-sm text-slate-500">
                  ¿No tenés cuenta?{" "}
                  <Link
                    to="/register"
                    className="font-semibold text-[#0085db] hover:text-[#0074c2]"
                  >
                    Registrar empresa
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
