'use client';

import { useState, useTransition, useEffect, type ChangeEvent } from 'react';
import Link from 'next/link';
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
} from '@hubilee/ui';
import { authApi } from '@/lib/api/client';

function hubForgotPasswordUrl(): string {
  const base = (process.env.NEXT_PUBLIC_HUB_URL ?? 'http://localhost:3001').replace(/\/$/, '');
  return `${base}/forgot-password`;
}

const workifyPanel = (
  <AuthBrandDecorativePanel
    badge="Workify"
    title="Recursos humanos"
    description="Turnos, asistencia y equipos con la misma identidad visual que el resto de Hubilee."
    quote={<>Personas y equipos, en un solo flujo.</>}
  />
);

type CompanyOption = { id: string; name: string; workifyEnabled?: boolean; shopflowEnabled?: boolean };

function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function sanitizeInput(value: string): string {
  return value
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .substring(0, 100);
}

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, startTransition] = useTransition();
  const [csrfToken, setCsrfToken] = useState('');
  const [companies, setCompanies] = useState<CompanyOption[] | null>(null);
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaTempToken, setMfaTempToken] = useState<string | null>(null);
  const [mfaCompanyId, setMfaCompanyId] = useState<string | undefined>(undefined);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaBackup, setMfaBackup] = useState(false);

  useEffect(() => {
    setCsrfToken(generateCSRFToken());
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 100;
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6 && password.length <= 128;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(sanitizeInput(e.target.value));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(sanitizeInput(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('El email es requerido');
      return;
    }

    if (!password.trim()) {
      setError('La contraseña es requerida');
      return;
    }

    if (!validateEmail(email)) {
      setError('Formato de email inválido');
      return;
    }

    if (!validatePassword(password)) {
      setError('La contraseña debe tener entre 6 y 128 caracteres');
      return;
    }

    if (!csrfToken) {
      setError('Error de seguridad. Recarga la página e intenta de nuevo.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await authApi.post<{
          success?: boolean;
          data?: { user: unknown; companyId?: string; company?: unknown; companies?: CompanyOption[] };
          error?: string;
        }>('/login', {
          email: email.toLowerCase().trim(),
          password,
          csrfToken,
        });

        const data =
          res && typeof res === 'object' && 'data' in res
            ? (res as { data?: { user: unknown; companyId?: string; companies?: CompanyOption[] } }).data
            : undefined;
        const err = (res as { error?: string })?.error;
        if (err) {
          setError(err);
          return;
        }

        const mfaData = data as { mfaRequired?: boolean; tempToken?: string; companyId?: string } | undefined;
        if (mfaData?.mfaRequired && mfaData.tempToken) {
          setMfaTempToken(mfaData.tempToken);
          setMfaCompanyId(mfaData.companyId);
          setMfaStep(true);
          setMfaCode('');
          setMfaBackup(false);
          return;
        }

        const companyId = data?.companyId ?? (res as { companyId?: string }).companyId;
        const companiesList = data?.companies ?? (res as { companies?: CompanyOption[] }).companies;

        if (!data?.user && !(res as { user?: unknown }).user) {
          setError('Respuesta del servidor inválida');
          return;
        }

        if (companiesList && companiesList.length > 1 && !companyId) {
          setCompanies(companiesList);
          return;
        }

        window.location.href = '/dashboard';
      } catch (err) {
        console.error('Error de login:', err);
        setError('Error de conexión. Inténtalo de nuevo.');
      }
    });
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!mfaTempToken || !mfaCode.trim()) {
      setError('Introduce el código.');
      return;
    }
    startTransition(async () => {
      try {
        const res = mfaBackup
          ? await authApi.post<{ success?: boolean; error?: string }>('/mfa/verify-backup', {
              tempToken: mfaTempToken,
              backupCode: mfaCode.trim(),
              companyId: mfaCompanyId,
            })
          : await authApi.post<{ success?: boolean; error?: string }>('/mfa/verify', {
              tempToken: mfaTempToken,
              totpCode: mfaCode.trim(),
              companyId: mfaCompanyId,
            });
        const ok = res && typeof res === 'object' && (res as { success?: boolean }).success === true;
        if (!ok) {
          setError((res as { error?: string })?.error || 'Código inválido');
          return;
        }
        window.location.href = '/dashboard';
      } catch (err) {
        console.error('MFA error:', err);
        setError('Código inválido o sesión expirada.');
      }
    });
  };

  const handleChooseCompany = async (companyId: string) => {
    setError('');
    startTransition(async () => {
      try {
        const res = await authApi.post<{ success?: boolean; error?: string }>('/context', { companyId });
        if (res && typeof res === 'object' && !(res as { success?: boolean }).success && (res as { error?: string }).error) {
          setError((res as { error?: string }).error!);
          return;
        }
        window.location.href = '/dashboard';
      } catch (err) {
        console.error('Error al elegir empresa:', err);
        setError('Error al elegir empresa. Inténtalo de nuevo.');
      }
    });
  };

  if (mfaStep && mfaTempToken) {
    return (
      <AuthLayout variant="brand" panel={workifyPanel}>
        <AuthBrandWelcomeHeader subtitle="Accede a tu cuenta de Workify" />
        <AuthBrandCard
          cardTitle="Verificación en dos pasos"
          cardDescription={
            mfaBackup
              ? 'Introduce un código de respaldo de un solo uso.'
              : 'Introduce el código de tu app autenticadora.'
          }
        >
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            {error ? (
              <AuthBrandErrorAlert variant="error">
                <p className="text-sm text-red-200">{error}</p>
              </AuthBrandErrorAlert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="mfa-code" className={AUTH_BRAND_LABEL_CLASS}>
                {mfaBackup ? 'Código de respaldo' : 'Código TOTP'}
              </Label>
              <Input
                id="mfa-code"
                type="text"
                inputMode={mfaBackup ? 'text' : 'numeric'}
                value={mfaCode}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setMfaCode(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="one-time-code"
                placeholder={mfaBackup ? 'XXXX-XXXX-XXXX' : '000000'}
                className={AUTH_BRAND_INPUT_CLASS}
              />
            </div>
            <Button
              type="button"
              variant="link"
              className={AUTH_BRAND_LINK_SUBTLE_CLASS}
              onClick={() => {
                setMfaBackup(!mfaBackup);
                setMfaCode('');
                setError('');
              }}
            >
              {mfaBackup ? 'Usar código de la app autenticadora' : 'Usar código de respaldo'}
            </Button>
            <Button type="submit" disabled={isLoading} className={AUTH_BRAND_PRIMARY_BUTTON_CLASS}>
              {isLoading ? 'Verificando…' : 'Continuar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={AUTH_BRAND_OUTLINE_BUTTON_CLASS}
              onClick={() => {
                setMfaStep(false);
                setMfaTempToken(null);
                setMfaCode('');
                setError('');
              }}
            >
              Volver
            </Button>
          </form>
        </AuthBrandCard>
      </AuthLayout>
    );
  }

  if (companies && companies.length > 1) {
    return (
      <AuthLayout variant="brand" panel={workifyPanel}>
        <AuthBrandWelcomeHeader subtitle="Accede a tu cuenta de Workify" />
        <AuthBrandCard
          cardTitle="Elige una empresa"
          cardDescription="Tienes acceso a varias empresas. Selecciona con cuál continuar."
        >
          <div className="space-y-3">
            {error ? (
              <AuthBrandErrorAlert variant="error">
                <p className="text-sm text-red-200">{error}</p>
              </AuthBrandErrorAlert>
            ) : null}
            <div className="space-y-2">
              {companies.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleChooseCompany(c.id)}
                  disabled={isLoading}
                  className="w-full text-left px-4 py-3 rounded-xl border border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/25 transition-colors font-medium"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </AuthBrandCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout variant="brand" panel={workifyPanel}>
      <AuthBrandWelcomeHeader subtitle="Accede a tu cuenta de Workify" />
      <AuthBrandCard
        cardTitle="Iniciar sesión"
        cardDescription="Introduce tus credenciales"
        footer={
          <AuthBrandLoginFooterLinks
            signUpLine={
              <>
                ¿No tienes cuenta?{' '}
                <Link href="/register" className="text-indigo-300 hover:text-indigo-200 font-medium">
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
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="csrfToken" value={csrfToken} />

          {error ? (
            <AuthBrandErrorAlert variant="error">
              <p className="text-sm text-red-200">{error}</p>
            </AuthBrandErrorAlert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="login-email" className={AUTH_BRAND_LABEL_CLASS}>
              Email
            </Label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="tu@empresa.com"
              required
              disabled={isLoading}
              maxLength={100}
              autoComplete="email"
              className={AUTH_BRAND_INPUT_CLASS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password" className={AUTH_BRAND_LABEL_CLASS}>
              Contraseña
            </Label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              required
              disabled={isLoading}
              maxLength={128}
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

          <Button type="submit" disabled={isLoading} className={AUTH_BRAND_PRIMARY_BUTTON_CLASS}>
            {isLoading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </Button>
        </form>
      </AuthBrandCard>
    </AuthLayout>
  );
}
