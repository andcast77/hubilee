'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Mode = 'login' | 'register'

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? '/dashboard'
  const sessionReason = searchParams.get('reason')
  const sessionReasonMessage =
    sessionReason === 'session'
      ? 'Tu sesión expiró o dejó de ser válida. Volvé a ingresar.'
      : sessionReason === 'server'
        ? 'El servidor no pudo validar tu cuenta (suele ser base de datos o configuración). Si administrás el sistema, revisá DATABASE_URL, migraciones y los logs del servidor.'
        : sessionReason === 'account'
          ? 'No pudimos obtener los datos de tu cuenta.'
          : sessionReason === 'network'
            ? 'No pudimos conectar con el servidor para validar la sesión.'
            : null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })
      const data = (await res.json().catch(() => ({}))) as { message?: string }

      if (!res.ok) {
        setError(data.message ?? 'No se pudo completar la solicitud.')
        return
      }

      router.push(from)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} method="post" className="mt-8 flex flex-col gap-4">
      {sessionReasonMessage ? (
        <p
          className="rounded-lg border border-amber-200/90 bg-amber-50 px-3 py-2.5 text-sm text-amber-950"
          role="status"
        >
          {sessionReasonMessage}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="auth-email">Email</Label>
        <Input
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="auth-password">Contraseña</Label>
        <Input
          id="auth-password"
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="mt-2 w-full rounded-full" disabled={pending}>
        {pending ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
      </Button>
      <p className="text-center text-sm text-[var(--color-muted)]">
        {mode === 'login' ? (
          <>
            ¿No tenés cuenta?{' '}
            <Link
              href={`/register${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
              className="font-medium text-[var(--color-accent-bright)] underline-offset-4 hover:underline"
            >
              Registrate
            </Link>
          </>
        ) : (
          <>
            ¿Ya tenés cuenta?{' '}
            <Link
              href={`/login${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
              className="font-medium text-[var(--color-accent-bright)] underline-offset-4 hover:underline"
            >
              Ingresá
            </Link>
          </>
        )}
      </p>
    </form>
  )
}
