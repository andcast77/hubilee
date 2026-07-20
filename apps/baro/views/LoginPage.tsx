'use client'

import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
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
} from '@hubilee/ui'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ApiResponse, LoginResponse } from '@hubilee/contracts'
import { loginSchema } from '@/lib/validations/auth'
import { authApi } from '@/lib/api/client'
import { hubForgotPasswordUrl, hubRegisterUrl } from '@/lib/landingUrls'
import { site } from '@/locales/site'

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/')) return null
  if (raw.startsWith('//')) return null
  return raw
}

export function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = useMemo(() => {
    return (
      safeNextPath(searchParams.get('next')) ??
      safeNextPath(searchParams.get('from')) ??
      '/dashboard'
    )
  }, [searchParams])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mfaStep, setMfaStep] = useState(false)
  const [mfaTempToken, setMfaTempToken] = useState<string | null>(null)
  const [mfaCompanyId, setMfaCompanyId] = useState<string | undefined>(undefined)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaBackup, setMfaBackup] = useState(false)

  const decorativePanel = (
    <AuthBrandDecorativePanel
      badge={
        <>
          <span>🏗️</span>
          <span>{site.brand}</span>
        </>
      }
      title="Gestión de expedientes"
      description={
        <>
          Arquitectura, levantamientos topográficos y obra civil: expedientes, mensuras y documentación
          técnica con el mismo estándar que tu estudio profesional.
        </>
      }
      quote={<>Expedientes y trámites, alineados en un solo flujo de trabajo.</>}
    />
  )

  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Datos inválidos')
      return
    }
    setIsLoading(true)
    try {
      const res = await authApi.post<ApiResponse<LoginResponse>>('/login', {
        email: parsed.data.email,
        password: parsed.data.password,
      })
      if (!res.success || !res.data) {
        setError(res.error || 'Credenciales inválidas')
        return
      }
      if (res.data.mfaRequired && res.data.tempToken) {
        setMfaStep(true)
        setMfaTempToken(res.data.tempToken)
        setMfaCompanyId(res.data.companyId)
        setMfaCode('')
        setMfaBackup(false)
        return
      }
      router.replace(nextPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleMfaSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!mfaTempToken || !mfaCode.trim()) {
      setError('Introduce el código.')
      return
    }
    setIsLoading(true)
    try {
      const res = mfaBackup
        ? await authApi.post<ApiResponse<LoginResponse>>('/mfa/verify-backup', {
            tempToken: mfaTempToken,
            backupCode: mfaCode.trim(),
            companyId: mfaCompanyId,
          })
        : await authApi.post<ApiResponse<LoginResponse>>('/mfa/verify', {
            tempToken: mfaTempToken,
            totpCode: mfaCode.trim(),
            companyId: mfaCompanyId,
          })
      if (!res.success || !res.data) {
        setError(res.error || 'Código inválido')
        return
      }
      router.replace(nextPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo verificar')
    } finally {
      setIsLoading(false)
    }
  }

  const registerHref = hubRegisterUrl(searchParams.toString())

  return (
    <AuthLayout variant="brand" panel={decorativePanel}>
      <AuthBrandWelcomeHeader subtitle={`Accede a tu cuenta de ${site.brand}`} />

      <AuthBrandCard
        cardTitle={mfaStep ? 'Verificación en dos pasos' : 'Iniciar sesión'}
        cardDescription={
          mfaStep
            ? mfaBackup
              ? 'Introduce un código de respaldo de un solo uso.'
              : 'Introduce el código de tu app autenticadora.'
            : 'Introduce tus credenciales'
        }
        footer={
          !mfaStep ? (
            <AuthBrandLoginFooterLinks
              signUpLine={
                <>
                  ¿No tienes cuenta?{' '}
                  <a
                    href={registerHref}
                    className="text-indigo-300 hover:text-indigo-200 font-medium"
                  >
                    Registrarse en Hub
                  </a>
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
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            {error ? (
              <AuthBrandErrorAlert variant="error">
                <p className="text-sm text-red-200">{error}</p>
              </AuthBrandErrorAlert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="baro-mfa-code" className={AUTH_BRAND_LABEL_CLASS}>
                {mfaBackup ? 'Código de respaldo' : 'Código TOTP'}
              </Label>
              <Input
                id="baro-mfa-code"
                type="text"
                inputMode={mfaBackup ? 'text' : 'numeric'}
                value={mfaCode}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setMfaCode(e.target.value)}
                placeholder={mfaBackup ? 'XXXX-XXXX-XXXX' : '000000'}
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
                setMfaBackup(!mfaBackup)
                setMfaCode('')
                setError(null)
              }}
            >
              {mfaBackup
                ? 'Usar código de la app autenticadora'
                : 'Usar código de respaldo'}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={AUTH_BRAND_PRIMARY_BUTTON_CLASS}
            >
              {isLoading ? 'Verificando…' : 'Continuar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={AUTH_BRAND_OUTLINE_BUTTON_CLASS}
              onClick={() => {
                setMfaStep(false)
                setMfaTempToken(null)
                setMfaCode('')
                setError(null)
              }}
            >
              Volver
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {error ? (
              <AuthBrandErrorAlert variant="error">
                <p className="text-sm text-red-200">{error}</p>
              </AuthBrandErrorAlert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="baro-email" className={AUTH_BRAND_LABEL_CLASS}>
                Email
              </Label>
              <Input
                id="baro-email"
                type="email"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                autoComplete="email"
                disabled={isLoading}
                className={AUTH_BRAND_INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baro-password" className={AUTH_BRAND_LABEL_CLASS}>
                Contraseña
              </Label>
              <Input
                id="baro-password"
                type="password"
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
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
              {isLoading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </Button>
          </form>
        )}
      </AuthBrandCard>
    </AuthLayout>
  )
}
