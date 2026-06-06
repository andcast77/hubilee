'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAccount } from '@/components/app/account-context'

let redirectScheduled = false

async function clearSessionAndRedirectToLogin(
  fromPath: string,
  reason: string,
  status: number | null,
  replace: (url: string) => void
) {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
  } catch {
    /* cookies igual se limpian en el servidor si la petición llega */
  }
  const params = new URLSearchParams()
  if (fromPath && fromPath !== '/login') params.set('from', fromPath)
  params.set('reason', reason)
  if (status != null) params.set('s', String(status))
  replace(`/login?${params.toString()}`)
}

function reasonForFailedMe(lastMeStatus: number | null): string {
  if (lastMeStatus === 401) return 'session'
  if (lastMeStatus === 502 || lastMeStatus === 503 || lastMeStatus === 504 || lastMeStatus === 429)
    return 'transient'
  if (lastMeStatus != null && lastMeStatus >= 500) return 'server'
  if (lastMeStatus != null) return 'account'
  return 'network'
}

/**
 * El panel `/app` solo se muestra con sesión válida y `GET /api/auth/me` correcto.
 * Si no hay usuario o la API falla, se cierra sesión y se vuelve al login.
 */
export function AppSessionGate({ children }: Readonly<{ children: ReactNode }>) {
  const { user, loading, lastMeStatus, error, refresh } = useAccount()
  const router = useRouter()
  const pathname = usePathname()

  const transientUpstream =
    lastMeStatus === 502 || lastMeStatus === 503 || lastMeStatus === 504 || lastMeStatus === 429

  useEffect(() => {
    if (user) {
      redirectScheduled = false
    }
  }, [user])

  useEffect(() => {
    if (loading) return
    if (user) return
    if (transientUpstream) return
    if (redirectScheduled) return
    redirectScheduled = true

    const from = `${pathname}${window.location.search}`
    const reason = reasonForFailedMe(lastMeStatus)
    void clearSessionAndRedirectToLogin(from, reason, lastMeStatus, (url) => router.replace(url))
  }, [loading, user, lastMeStatus, transientUpstream, pathname, router])

  if (loading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 bg-[var(--app-sidebar-bg)] px-4 text-center text-[var(--app-sidebar-fg)]">
        <p className="text-sm font-medium">Cargando sesión…</p>
        <p className="max-w-sm text-xs text-[var(--app-sidebar-muted)]">
          Validando tu cuenta con el servidor.
        </p>
      </div>
    )
  }

  if (!user) {
    if (transientUpstream) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[var(--app-sidebar-bg)] px-4 text-center text-[var(--app-sidebar-fg)]">
          <p className="text-sm font-medium">Servidor o base ocupados</p>
          <p className="max-w-sm text-xs text-[var(--app-sidebar-muted)]">
            {error ??
              'No pudimos validar tu sesión por un problema temporal. No cerramos tu sesión.'}
          </p>
          <button
            type="button"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-muted/60"
            onClick={() => {
              redirectScheduled = false
              void refresh()
            }}
          >
            Reintentar
          </button>
        </div>
      )
    }

    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 bg-[var(--app-sidebar-bg)] px-4 text-center text-[var(--app-sidebar-fg)]">
        <p className="text-sm font-medium">Cerrando sesión…</p>
        <p className="max-w-sm text-xs text-[var(--app-sidebar-muted)]">
          La sesión no pudo validarse. Te llevamos al inicio de sesión.
        </p>
      </div>
    )
  }

  return children
}
