"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  AuthLayout,
  AuthBrandDecorativePanel,
  AuthBrandWelcomeHeader,
  AuthBrandCard,
  AuthBrandErrorAlert,
  AuthBrandLoginFooterLinks,
  AuthBrandForgotPasswordRow,
  AUTH_BRAND_INPUT_CLASS,
  AUTH_BRAND_LABEL_CLASS,
  AUTH_BRAND_PRIMARY_BUTTON_CLASS,
  AUTH_BRAND_FORGOT_LINK_CLASS,
  AUTH_BRAND_LINK_SUBTLE_CLASS,
  AUTH_BRAND_OUTLINE_BUTTON_CLASS,
  AUTH_BRAND_HOME_LINK_CLASS,
  Button,
  Input,
  Label,
} from "@hubilee/ui";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import type { ApiResponse, LoginResponse } from "@hubilee/contracts";
import {
  floorLoginSchema,
  loginSchema,
  shouldShowFloorTurnstile,
} from "@/lib/validations/auth";
import { authApi } from "@/lib/api/client";
import { floorLogin } from "@/lib/services/authService";
import { getLandingUrls } from "@/lib/landingUrls";
import { RegistrationTurnstile } from "@/components/auth/RegistrationTurnstile";

type LoginMode = "owner" | "floor";

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  return raw;
}

function hubForgotPasswordUrl(): string {
  const base = getLandingUrls().hub.replace(/\/$/, "");
  return `${base}/forgot-password`;
}

export function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { next?: string };
  const nextPath = useMemo(
    () => safeNextPath(search.next ?? null),
    [search.next],
  );
  const [loginMode, setLoginMode] = useState<LoginMode>("owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [floorFailCount, setFloorFailCount] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaTempToken, setMfaTempToken] = useState<string | null>(null);
  const [mfaCompanyId, setMfaCompanyId] = useState<string | undefined>(
    undefined,
  );
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBackup, setMfaBackup] = useState(false);

  const showFloorTurnstile = shouldShowFloorTurnstile(floorFailCount);

  const decorativePanel = (
    <AuthBrandDecorativePanel
      badge={
        <>
          <span>✨</span>
          <span>Pos</span>
        </>
      }
      title="Operación en tienda"
      description={
        <>
          Ventas, inventario y pedidos con el mismo ritmo que tu negocio:
          diseñado para el día a día del punto de venta, no como catálogo
          genérico.
        </>
      }
      quote={<>Caja, stock y clientes, alineados en un solo flujo.</>}
    />
  );

  function switchMode(mode: LoginMode) {
    setLoginMode(mode);
    setError(null);
    setPassword("");
    setCaptchaToken(null);
  }

  async function handleOwnerLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Datos inválidos");
      return;
    }
    setIsLoading(true);
    try {
      const res = await authApi.post<ApiResponse<LoginResponse>>("/login", {
        email,
        password,
      });
      if (!res.success || !res.data) {
        setError(res.error || "Credenciales inválidas");
        return;
      }
      if (res.data.mfaRequired && res.data.tempToken) {
        setMfaStep(true);
        setMfaTempToken(res.data.tempToken);
        setMfaCompanyId(res.data.companyId);
        setMfaCode("");
        setMfaBackup(false);
        return;
      }
      void navigate({ to: nextPath ?? "/dashboard", replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar sesión",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFloorLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = floorLoginSchema.safeParse({
      companyCode,
      employeeCode,
      password,
      ...(captchaToken ? { captchaToken } : {}),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Datos inválidos");
      return;
    }
    if (showFloorTurnstile && !captchaToken) {
      setError("Completa la verificación de seguridad");
      return;
    }
    setIsLoading(true);
    try {
      await floorLogin(parsed.data);
      void navigate({ to: nextPath ?? "/dashboard", replace: true });
    } catch (err) {
      setFloorFailCount((n) => n + 1);
      setCaptchaToken(null);
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar sesión",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMfaSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!mfaTempToken || !mfaCode.trim()) {
      setError("Introduce el código.");
      return;
    }
    setIsLoading(true);
    try {
      const res = mfaBackup
        ? await authApi.post<ApiResponse<LoginResponse>>("/mfa/verify-backup", {
            tempToken: mfaTempToken,
            backupCode: mfaCode.trim(),
            companyId: mfaCompanyId,
          })
        : await authApi.post<ApiResponse<LoginResponse>>("/mfa/verify", {
            tempToken: mfaTempToken,
            totpCode: mfaCode.trim(),
            companyId: mfaCompanyId,
          });
      if (!res.success || !res.data) {
        setError(res.error || "Código inválido");
        return;
      }
      void navigate({ to: nextPath ?? "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo verificar");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout variant="brand" panel={decorativePanel}>
      <AuthBrandWelcomeHeader subtitle="Accede a tu cuenta de Pos" />

      <AuthBrandCard
        cardTitle={mfaStep ? "Verificación en dos pasos" : "Iniciar sesión"}
        cardDescription={
          mfaStep
            ? mfaBackup
              ? "Introduce un código de respaldo de un solo uso."
              : "Introduce el código de tu app autenticadora."
            : loginMode === "floor"
              ? "Código de empresa, empleado y contraseña"
              : "Introduce tus credenciales"
        }
        footer={
          !mfaStep ? (
            <AuthBrandLoginFooterLinks
              signUpLine={
                <>
                  ¿No tienes cuenta?{" "}
                  <Link
                    to="/register"
                    className="text-indigo-300 hover:text-indigo-200 font-medium"
                  >
                    Registrarse
                  </Link>
                </>
              }
              homeLine={
                <Link to="/" className={AUTH_BRAND_HOME_LINK_CLASS}>
                  Volver al inicio
                </Link>
              }
            />
          ) : undefined
        }
      >
        {mfaStep ? (
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            {error ? (
              <AuthBrandErrorAlert variant="error">
                <p className="text-sm text-red-200">{error}</p>
              </AuthBrandErrorAlert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="sf-mfa-code" className={AUTH_BRAND_LABEL_CLASS}>
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
                className={AUTH_BRAND_INPUT_CLASS}
              />
            </div>
            <Button
              type="button"
              variant="link"
              className={AUTH_BRAND_LINK_SUBTLE_CLASS}
              onClick={() => {
                setMfaBackup(!mfaBackup);
                setMfaCode("");
                setError(null);
              }}
            >
              {mfaBackup
                ? "Usar código de la app autenticadora"
                : "Usar código de respaldo"}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={AUTH_BRAND_PRIMARY_BUTTON_CLASS}
            >
              {isLoading ? "Verificando…" : "Continuar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={AUTH_BRAND_OUTLINE_BUTTON_CLASS}
              onClick={() => {
                setMfaStep(false);
                setMfaTempToken(null);
                setMfaCode("");
                setError(null);
              }}
            >
              Volver
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={loginMode === "owner" ? "default" : "outline"}
                className={
                  loginMode === "owner"
                    ? AUTH_BRAND_PRIMARY_BUTTON_CLASS
                    : AUTH_BRAND_OUTLINE_BUTTON_CLASS
                }
                onClick={() => switchMode("owner")}
                disabled={isLoading}
              >
                Propietario
              </Button>
              <Button
                type="button"
                variant={loginMode === "floor" ? "default" : "outline"}
                className={
                  loginMode === "floor"
                    ? AUTH_BRAND_PRIMARY_BUTTON_CLASS
                    : AUTH_BRAND_OUTLINE_BUTTON_CLASS
                }
                onClick={() => switchMode("floor")}
                disabled={isLoading}
              >
                Personal de piso
              </Button>
            </div>

            {loginMode === "owner" ? (
              <form onSubmit={handleOwnerLoginSubmit} className="space-y-4">
                {error ? (
                  <AuthBrandErrorAlert variant="error">
                    <p className="text-sm text-red-200">{error}</p>
                  </AuthBrandErrorAlert>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="sf-email" className={AUTH_BRAND_LABEL_CLASS}>
                    Email
                  </Label>
                  <Input
                    id="sf-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@empresa.com"
                    autoComplete="email"
                    disabled={isLoading}
                    className={AUTH_BRAND_INPUT_CLASS}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="sf-password"
                    className={AUTH_BRAND_LABEL_CLASS}
                  >
                    Contraseña
                  </Label>
                  <Input
                    id="sf-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isLoading}
                    className={AUTH_BRAND_INPUT_CLASS}
                  />
                </div>
                <AuthBrandForgotPasswordRow>
                  <a
                    href={hubForgotPasswordUrl()}
                    className={AUTH_BRAND_FORGOT_LINK_CLASS}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </AuthBrandForgotPasswordRow>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={AUTH_BRAND_PRIMARY_BUTTON_CLASS}
                >
                  {isLoading ? "Iniciando sesión…" : "Iniciar sesión"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleFloorLoginSubmit} className="space-y-4">
                {error ? (
                  <AuthBrandErrorAlert variant="error">
                    <p className="text-sm text-red-200">{error}</p>
                  </AuthBrandErrorAlert>
                ) : null}
                <div className="space-y-2">
                  <Label
                    htmlFor="sf-company-code"
                    className={AUTH_BRAND_LABEL_CLASS}
                  >
                    Código de empresa
                  </Label>
                  <Input
                    id="sf-company-code"
                    type="text"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    placeholder="Código de la empresa"
                    autoComplete="off"
                    disabled={isLoading}
                    className={AUTH_BRAND_INPUT_CLASS}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="sf-employee-code"
                    className={AUTH_BRAND_LABEL_CLASS}
                  >
                    Código de empleado
                  </Label>
                  <Input
                    id="sf-employee-code"
                    type="text"
                    inputMode="numeric"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="000000"
                    autoComplete="username"
                    disabled={isLoading}
                    className={AUTH_BRAND_INPUT_CLASS}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="sf-floor-password"
                    className={AUTH_BRAND_LABEL_CLASS}
                  >
                    Contraseña
                  </Label>
                  <Input
                    id="sf-floor-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isLoading}
                    className={AUTH_BRAND_INPUT_CLASS}
                  />
                </div>
                {showFloorTurnstile ? (
                  <RegistrationTurnstile onToken={setCaptchaToken} />
                ) : null}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={AUTH_BRAND_PRIMARY_BUTTON_CLASS}
                >
                  {isLoading ? "Iniciando sesión…" : "Iniciar sesión"}
                </Button>
              </form>
            )}
          </div>
        )}
      </AuthBrandCard>
    </AuthLayout>
  );
}
