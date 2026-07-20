'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi } from '@/lib/api-client'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hubilee/ui'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export function VerifyEmailPage() {
    const [resending, setResending] = useState(false)
    const [resentMsg, setResentMsg] = useState('')
    const [resentError, setResentError] = useState('')
    const [resentEmail, setResentEmail] = useState('')

    async function handleResend() {
      setResending(true)
      setResentMsg('')
      setResentError('')
      try {
        let email = resentEmail
        if (!email) {
          email = window.prompt('Ingresa tu email para reenviar el link de verificación:') || ''
          setResentEmail(email)
        }
        if (!email) {
          setResentError('Email requerido para reenviar')
          setResending(false)
          return
        }
        const res = await authApi.resendVerification(email)
        if (res.success) {
          setResentMsg(res.message || 'Email de verificación reenviado')
        } else {
          setResentError(res.error || 'No se pudo reenviar el email')
        }
      } catch (err: any) {
        setResentError(err?.message || 'Error al reenviar email')
      }
      setResending(false)
    }
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token de verificación no proporcionado')
      return
    }

    let isMounted = true

    async function verifyEmail() {
      try {
        const res = await authApi.verifyEmail(token!)
        if (!isMounted) return

        if (res.success) {
          setStatus('success')
          setMessage(res.message || 'Email verificado exitosamente')

          setTimeout(() => {
            if (isMounted) {
              router.replace('/login')
            }
          }, 2000)
        } else {
          setStatus('error')
          setMessage(res.error || 'Error al verificar email')
        }
      } catch (error: any) {
        if (!isMounted) return
        setStatus('error')
        setMessage(error?.response?.data?.error || 'Error al verificar email')
      }
    }

    verifyEmail()

    return () => {
      isMounted = false
    }
  }, [token, router])

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-white/60 bg-white/90 shadow-2xl backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {status === 'loading' && (
                <Loader2 className="h-16 w-16 text-sky-500 animate-spin" />
              )}
              {status === 'success' && (
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              )}
              {status === 'error' && (
                <XCircle className="h-16 w-16 text-red-500" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {status === 'loading' && 'Verificando email...'}
              {status === 'success' && '¡Email verificado!'}
              {status === 'error' && 'Error de verificación'}
            </CardTitle>
            <CardDescription>
              {status === 'loading' && 'Por favor espera mientras verificamos tu email'}
              {status === 'success' && 'Tu cuenta ha sido activada exitosamente'}
              {status === 'error' && 'No pudimos verificar tu email'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-lg ${
              status === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : status === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-slate-50 border border-slate-200'
            }`}>
              <p className={`text-sm text-center ${
                status === 'success' 
                  ? 'text-green-700' 
                  : status === 'error'
                  ? 'text-red-700'
                  : 'text-slate-700'
              }`}>
                {message}
              </p>
            </div>

            {status === 'success' && (
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-4">
                  Serás redirigido al inicio de sesión en unos segundos…
                </p>
                <Button
                  onClick={() => router.replace('/login')}
                  className="w-full"
                >
                  Ir al Login
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={() => void handleResend()}
                  disabled={resending}
                  className="w-full"
                >
                  {resending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 inline animate-spin" />
                      Reenviando…
                    </>
                  ) : (
                    'Reenviar email de verificación'
                  )}
                </Button>
                {resentMsg ? (
                  <p className="text-sm text-center text-green-700">{resentMsg}</p>
                ) : null}
                {resentError ? (
                  <p className="text-sm text-center text-red-600">{resentError}</p>
                ) : null}
                <Button
                  onClick={() => router.push('/login')}
                  className="w-full"
                  variant="outline"
                >
                  Ir al Login
                </Button>
                <Link href="/register" className="block">
                  <Button variant="ghost" className="w-full">
                    ¿Necesitas una cuenta? Regístrate
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
