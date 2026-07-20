"use client";

import { useState } from "react";
import Link from "next/link";
import type { ApiResponse, LoginResponse } from "@hubilee/contracts";
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
  AUTH_BRAND_SELECT_CLASS,
  Button,
  Input,
  Label,
} from "@hubilee/ui";
import { authApi } from "@/lib/api/client";

function hubBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_HUB_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

function hubForgotPasswordUrl(): string {
  return `${hubBaseUrl()}/forgot-password`;
}

function hubRegisterUrl(): string {
  return `${hubBaseUrl()}/register`;
}

const tsPanel = (
  <AuthBrandDecorativePanel
    badge="Tech Services"
    title="Órdenes y campo"
    description="Órdenes de trabajo, activos y cuadrillas con foco en operación de campo, no en marketing genérico."
    quote={<>Del taller al cliente, con trazabilidad.</>}
  />
);

type CompanyOption = {
  id: string;
  name: string;
  workifyEnabled?: boolean;
  shopflowEnabled?: boolean;
  technicalServicesEnabled?: boolean;
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[] | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectingCompany, setSelectingCompany] = useState(false);
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaTempToken, setMfaTempToken] = useState<string | null>(null);
  const [mfaCompanyId, setMfaCompanyId] = useState<string | undefined>(undefined);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBackup, setMfaBackup] = useState(false);

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.post<ApiResponse<LoginResponse>>("/login", { email, password });

      if (!res?.success || !res.data) {
        setError(res?.error || "Error al iniciar sesión");
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

      const { company, companies: companyList } = res.data;

      if (company) {
        window.location.href = "/dashboard";
        return;
      }

      if (companyList && companyList.length > 1) {
        setCompanies(companyList);
        setSelectedCompanyId(companyList[0].id);
        setSelectingCompany(true);
        return;
      }

      if (companyList && companyList.length === 1) {
        const ctx = await authApi.post<{ success?: boolean; error?: string }>("/context", {
          companyId: companyList[0].id,
        });
        if (ctx?.success) {
          window.location.href = "/dashboard";
          return;
        }
      }

      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompanySelect(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCompanyId) return;
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.post<{
        success?: boolean;
        error?: string;
      }>("/context", {
        companyId: selectedCompanyId,
      });
      if (!res?.success) {
        setError(res?.error ?? "Error al seleccionar empresa");
        return;
      }
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!mfaTempToken || !mfaCode.trim()) {
      setError("Introduce el código.");
      return;
    }
    setLoading(true);
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
      if (!res?.success || !res.data) {
        setError(res?.error || "Código inválido");
        return;
      }
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (mfaStep && mfaTempToken) {
    return (
      <AuthLayout variant="brand" panel={tsPanel}>
        <AuthBrandWelcomeHeader subtitle="Accede a tu cuenta de Tech Services" />
        <AuthBrandCard
          cardTitle="Verificación en dos pasos"
          cardDescription={
            mfaBackup
              ? "Introduce un código de respaldo de un solo uso."
              : "Introduce el código de tu app autenticadora."
          }
        >
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            {error ? (
              <AuthBrandErrorAlert variant="error">
                <p className="text-sm text-red-200">{error}</p>
              </AuthBrandErrorAlert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="ts-mfa-code" className={AUTH_BRAND_LABEL_CLASS}>
                {mfaBackup ? "Código de respaldo" : "Código TOTP"}
              </Label>
              <Input
                id="ts-mfa-code"
                type="text"
                inputMode={mfaBackup ? "text" : "numeric"}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
                disabled={loading}
                autoComplete="one-time-code"
                placeholder={mfaBackup ? "XXXX-XXXX-XXXX" : "000000"}
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
              {mfaBackup ? "Usar código de la app autenticadora" : "Usar código de respaldo"}
            </Button>
            <Button type="submit" disabled={loading} className={AUTH_BRAND_PRIMARY_BUTTON_CLASS}>
              {loading ? "Verificando…" : "Continuar"}
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
        </AuthBrandCard>
      </AuthLayout>
    );
  }

  if (selectingCompany && companies && companies.length > 1) {
    return (
      <AuthLayout variant="brand" panel={tsPanel}>
        <AuthBrandWelcomeHeader subtitle="Accede a tu cuenta de Tech Services" />
        <AuthBrandCard
          cardTitle="Elige una empresa"
          cardDescription="Tienes acceso a varias empresas. Elige con cuál continuar."
        >
          <form onSubmit={handleCompanySelect} className="space-y-4">
            {error ? (
              <AuthBrandErrorAlert variant="error">
                <p className="text-sm text-red-200">{error}</p>
              </AuthBrandErrorAlert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="ts-company" className={AUTH_BRAND_LABEL_CLASS}>
                Empresa
              </Label>
              <select
                id="ts-company"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                required
                disabled={loading}
                className={AUTH_BRAND_SELECT_CLASS}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={loading} className={AUTH_BRAND_PRIMARY_BUTTON_CLASS}>
              {loading ? "Continuando…" : "Continuar"}
            </Button>
          </form>
        </AuthBrandCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout variant="brand" panel={tsPanel}>
      <AuthBrandWelcomeHeader subtitle="Accede a tu cuenta de Tech Services" />
      <AuthBrandCard
        cardTitle="Iniciar sesión"
        cardDescription="Introduce tus credenciales"
        footer={
          <AuthBrandLoginFooterLinks
            signUpLine={
              <>
                ¿No tienes cuenta?{" "}
                <a
                  href={hubRegisterUrl()}
                  className="text-indigo-300 hover:text-indigo-200 font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Registrarse
                </a>
              </>
            }
            homeLine={
              <Link href="/" className={AUTH_BRAND_HOME_LINK_CLASS}>
                Volver al inicio
              </Link>
            }
          />
        }
      >
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          {error ? (
            <AuthBrandErrorAlert variant="error">
              <p className="text-sm text-red-200">{error}</p>
            </AuthBrandErrorAlert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="ts-email" className={AUTH_BRAND_LABEL_CLASS}>
              Email
            </Label>
            <Input
              id="ts-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="tu@empresa.com"
              autoComplete="email"
              className={AUTH_BRAND_INPUT_CLASS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ts-password" className={AUTH_BRAND_LABEL_CLASS}>
              Contraseña
            </Label>
            <Input
              id="ts-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="••••••••"
              autoComplete="current-password"
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

          <Button type="submit" disabled={loading} className={AUTH_BRAND_PRIMARY_BUTTON_CLASS}>
            {loading ? "Iniciando sesión…" : "Iniciar sesión"}
          </Button>
        </form>
      </AuthBrandCard>
    </AuthLayout>
  );
}
