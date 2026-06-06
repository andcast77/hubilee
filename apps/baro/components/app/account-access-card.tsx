'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAccount } from '@/components/app/account-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AccountAccessCard() {
  const { user, loading, error, lastMeStatus, refresh } = useAccount()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordIssues, setPasswordIssues] = useState<
    { path: (string | number)[]; message: string }[]
  >([])
  const [passwordOk, setPasswordOk] = useState(false)

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordIssues([])
    setPasswordOk(false)
    setPasswordSaving(true)
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        message?: string
        issues?: { path: (string | number)[]; message: string }[]
      }
      if (!res.ok) {
        if (data.issues?.length) setPasswordIssues(data.issues)
        setPasswordError(data.message ?? 'No se pudo actualizar la contraseña.')
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordOk(true)
      void refresh()
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading && !user) {
    return (
      <section aria-busy="true">
        <p className="text-sm text-[var(--color-muted)]">Cargando…</p>
      </section>
    )
  }

  if (!user) {
    const showLogin = lastMeStatus === 401
    return (
      <section>
        <p className="text-sm text-[var(--color-muted)]">
          {error ?? 'No hay sesión activa. Si ves este mensaje, volvé a iniciar sesión.'}
        </p>
        {showLogin ? (
          <p className="mt-4">
            <Link
              href="/login?from=/cuenta"
              className="inline-flex rounded-full bg-[var(--color-cta)] px-5 py-2.5 text-sm font-semibold text-[var(--color-cta-foreground)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--color-cta-hover)]"
            >
              Ir a iniciar sesión
            </Link>
          </p>
        ) : null}
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-[var(--color-heading)]">Seguridad</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
        Cambiá la contraseña de tu usuario del panel. Seguís con la sesión iniciada en este
        dispositivo.
      </p>
      <form className="mt-4 space-y-4" onSubmit={changePassword}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="acc-current-pw">Contraseña actual</Label>
          <Input
            id="acc-current-pw"
            type="password"
            name="currentPassword"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="acc-new-pw">Contraseña nueva</Label>
          <Input
            id="acc-new-pw"
            type="password"
            name="newPassword"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="acc-confirm-pw">Repetir contraseña nueva</Label>
          <Input
            id="acc-confirm-pw"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {passwordIssues.length > 0 ? (
          <ul className="list-inside list-disc text-sm text-red-600 dark:text-red-400" role="alert">
            {passwordIssues.map((issue, idx) => (
              <li key={idx}>
                {issue.path.join('.')}: {issue.message}
              </li>
            ))}
          </ul>
        ) : null}
        {passwordError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {passwordError}
          </p>
        ) : null}
        {passwordOk ? (
          <p className="text-sm text-emerald-800 dark:text-emerald-200" role="status">
            Contraseña actualizada.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="submit" disabled={passwordSaving}>
            {passwordSaving ? 'Guardando…' : 'Actualizar contraseña'}
          </Button>
        </div>
      </form>
    </section>
  )
}
