"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authApi } from "@/lib/api-client";
import { shouldCallMeForLoggedInCheck } from "@/lib/auth-session-probe";
import { ApiError } from "@hubilee/shared";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
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

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  return raw;
}

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => safeNextPath(searchParams.get("next")),
    [searchParams],
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [resendHint, setResendHint] = useState<string | null>(null);

  const [mfaStep, setMfaStep] = useState(false);
  const [mfaTempToken, setMfaTempToken] = useState<string | null>(null);
  const [mfaCompanyId, setMfaCompanyId] = useState<string | undefined>(
    undefined,
  );
  const [mfaCode, setMfaCode] = useState("");
  const [mfaUseBackup, setMfaUseBackup] = useState(false);
  const [mfaSubmitting, setMfaSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!(await shouldCallMeForLoggedInCheck())) return;
        await authApi.meGuestProbe();
        router.replace(nextPath ?? "/dashboard");
      } catch {
        // stay on login
      }
    };

    checkAuth();
  }, [router, nextPath]);

  async function onSubmit(data: LoginInput) {
    try {
      setErrorMessage("");
      setNeedsVerification(false);
      setUserEmail(data.email);

      const res = await authApi.login(data.email, data.password);
      if (!res.success || !res.data) {
        setErrorMessage(
          res.error || "No se pudo iniciar sesión. Revisa tus credenciales.",
        );
        return;
      }

      if (res.data.mfaRequired && res.data.tempToken) {
        setMfaStep(true);
        setMfaTempToken(res.data.tempToken);
        setMfaCompanyId(res.data.companyId);
        setMfaCode("");
        setMfaUseBackup(false);
        setErrorMessage("");
        return;
      }

      router.replace(nextPath ?? "/dashboard");
    } catch (err: unknown) {
      console.error("Login error:", err);

      if (err instanceof ApiError && err.code === "ACCOUNT_LOCKED") {
        setErrorMessage(err.message);
        return;
      }

      const errorData = (
        err as { response?: { data?: { verified?: boolean; error?: string } } }
      )?.response?.data;
      if (errorData?.verified === false) {
        setNeedsVerification(true);
        setErrorMessage(
          errorData.error || "Debes verificar tu email antes de iniciar sesión",
        );
      } else {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Error al iniciar sesión. Verifica tus credenciales.",
        );
      }
    }
  }

  async function onSubmitMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaTempToken || !mfaCode.trim()) {
      setErrorMessage("Introduce el código.");
      return;
    }
    setMfaSubmitting(true);
    setErrorMessage("");
    try {
      const res = mfaUseBackup
        ? await authApi.verifyMfaBackup(
            mfaTempToken,
            mfaCode.trim(),
            mfaCompanyId,
          )
        : await authApi.verifyMfa(mfaTempToken, mfaCode.trim(), mfaCompanyId);
      if (!res.success || !res.data) {
        setErrorMessage(res.error || "Código inválido.");
        return;
      }
      router.replace(nextPath ?? "/dashboard");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "ACCOUNT_LOCKED") {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : "Código inválido.",
        );
      }
    } finally {
      setMfaSubmitting(false);
    }
  }

  const decorativePanel = (
    <AuthBrandDecorativePanel
      badge={
        <>
          <span>✨</span>
          <span>Hubilee Hub</span>
        </>
      }
      title="Gestiona tus módulos"
      description={
        <>
          Accede a todas tus herramientas de negocio en un solo lugar. Workify,
          Shopflow, Technical Services y más.
        </>
      }
      quote={<>Centraliza tu negocio, amplía tus posibilidades.</>}
    />
  );

  return (
    <AuthLayout variant="brand" panel={decorativePanel}>
      <AuthBrandWelcomeHeader subtitle="Accede a tu cuenta del Hub" />

      <AuthBrandCard
        cardTitle={mfaStep ? "Verificación en dos pasos" : "Iniciar sesión"}
        cardDescription={
          mfaStep
            ? mfaUseBackup
              ? "Introduce un código de respaldo de un solo uso."
              : "Introduce el código de tu app autenticadora."
            : "Introduce tus credenciales"
        }
        footer={
          !mfaStep ? (
            <AuthBrandLoginFooterLinks
              signUpLine={
                <>
                  ¿No tienes cuenta?{" "}
                  <Link
                    href="/register"
                    className="text-indigo-300 hover:text-indigo-200 font-medium"
                  >
                    Registrarse
                  </Link>
                </>
              }
              homeLine={
                <Link href="/" className={AUTH_BRAND_HOME_LINK_CLASS}>
                  Volver al inicio
                </Link>
              }
            />
          ) : undefined
        }
      >
        {mfaStep ? (
          <form onSubmit={onSubmitMfa} className="space-y-4">
            {errorMessage ? (
              <AuthBrandErrorAlert variant="error">
                <p className="text-sm text-red-200">{errorMessage}</p>
              </AuthBrandErrorAlert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="mfa-code" className={AUTH_BRAND_LABEL_CLASS}>
                {mfaUseBackup ? "Código de respaldo" : "Código TOTP"}
              </Label>
              <Input
                id="mfa-code"
                type="text"
                inputMode={mfaUseBackup ? "text" : "numeric"}
                autoComplete="one-time-code"
                placeholder={mfaUseBackup ? "XXXX-XXXX-XXXX" : "000000"}
                value={mfaCode}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setMfaCode(e.target.value)
                }
                className={AUTH_BRAND_INPUT_CLASS}
              />
            </div>
            <Button
              type="button"
              variant="link"
              className={AUTH_BRAND_LINK_SUBTLE_CLASS}
              onClick={() => {
                setMfaUseBackup(!mfaUseBackup);
                setMfaCode("");
                setErrorMessage("");
              }}
            >
              {mfaUseBackup
                ? "Usar código de la app autenticadora"
                : "Usar código de respaldo"}
            </Button>
            <Button
              type="submit"
              disabled={mfaSubmitting}
              className={AUTH_BRAND_PRIMARY_BUTTON_CLASS}
            >
              {mfaSubmitting ? "Verificando…" : "Continuar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={AUTH_BRAND_OUTLINE_BUTTON_CLASS}
              onClick={() => {
                setMfaStep(false);
                setMfaTempToken(null);
                setMfaCode("");
                setErrorMessage("");
              }}
            >
              Volver
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errorMessage ? (
              <AuthBrandErrorAlert
                variant={needsVerification ? "warning" : "error"}
              >
                <p
                  className={`text-sm ${needsVerification ? "text-amber-200" : "text-red-200"}`}
                >
                  {needsVerification
                    ? "Tu cuenta no está verificada. Será eliminada en 7 días si no la verificas. Revisa tu email para activar tu cuenta."
                    : errorMessage}
                </p>
                {needsVerification ? (
                  <div className="mt-2 space-y-1">
                    <Button
                      type="button"
                      variant="link"
                      className="text-xs text-amber-200 hover:text-amber-100 p-0 h-auto"
                      onClick={async () => {
                        try {
                          setResendHint(null);
                          await authApi.resendVerification(userEmail);
                          setResendHint(
                            "Te enviamos otro correo de verificación. Revisa tu bandeja de entrada.",
                          );
                        } catch {
                          setResendHint(
                            "No pudimos reenviar el correo. Inténtalo de nuevo más tarde.",
                          );
                        }
                      }}
                    >
                      Reenviar email de verificación
                    </Button>
                    {resendHint ? (
                      <p className="text-xs text-amber-100">{resendHint}</p>
                    ) : null}
                  </div>
                ) : null}
              </AuthBrandErrorAlert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email" className={AUTH_BRAND_LABEL_CLASS}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@empresa.com"
                {...register("email")}
                className={`${AUTH_BRAND_INPUT_CLASS} ${errors.email ? "border-red-400" : ""}`}
              />
              {errors.email ? (
                <p className="text-sm text-red-300">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className={AUTH_BRAND_LABEL_CLASS}>
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                className={`${AUTH_BRAND_INPUT_CLASS} ${errors.password ? "border-red-400" : ""}`}
              />
              {errors.password ? (
                <p className="text-sm text-red-300">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            <AuthBrandForgotPasswordRow>
              <Link
                href="/forgot-password"
                className={AUTH_BRAND_FORGOT_LINK_CLASS}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </AuthBrandForgotPasswordRow>

            <Button
              type="submit"
              disabled={isSubmitting}
              className={AUTH_BRAND_PRIMARY_BUTTON_CLASS}
            >
              {isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
            </Button>
          </form>
        )}
      </AuthBrandCard>
    </AuthLayout>
  );
}
