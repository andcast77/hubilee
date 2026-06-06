'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type AccountProfileSummary = {
  displayName: string
  professionalTitle: 'AGRIMENSOR' | 'INGENIERO_AGRIMENSOR'
  titleGrammarGender: 'MASCULINO' | 'FEMENINO'
  titularProfessionalId: string
} | null

export type AccountUser = {
  id: string
  email: string
  emailVerified: string | null
}

export type AccountRefreshOptions = {
  /** Si es true, no pone `loading` en true (evita pantalla completa de “Cargando sesión” en el panel). */
  silent?: boolean
}

type AccountContextValue = {
  user: AccountUser | null
  profile: AccountProfileSummary
  loading: boolean
  error: string | null
  /** Último código HTTP relevante: `GET /api/auth/me`, o código de `POST /api/auth/refresh` si éste falló antes del segundo `/me`. */
  lastMeStatus: number | null
  refresh: (options?: AccountRefreshOptions) => Promise<void>
}

const AccountContext = createContext<AccountContextValue | null>(null)

/** Access TTL from `jwt-access` + `accessCookieOptions` — keep renewal interval below this */
const ACCESS_TTL_MS = 30 * 60 * 1000
const SILENT_REFRESH_INTERVAL_MS = Math.floor(ACCESS_TTL_MS * 0.35)

function parseMeJson(text: string): {
  user?: AccountUser
  profile?: AccountProfileSummary | null
  message?: string
  error?: string
} {
  const trimmed = text.trim()
  if (!trimmed) return {}
  try {
    return JSON.parse(trimmed) as {
      user?: AccountUser
      profile?: AccountProfileSummary | null
      message?: string
      error?: string
    }
  } catch {
    return {}
  }
}

function messageFromMeBody(data: { message?: string; error?: string }): string | null {
  if (typeof data.message === 'string' && data.message.length > 0) return data.message
  if (typeof data.error === 'string' && data.error.length > 0 && data.error !== 'unauthorized') {
    return data.error
  }
  return null
}

export function AccountProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<AccountUser | null>(null)
  const [profile, setProfile] = useState<AccountProfileSummary>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastMeStatus, setLastMeStatus] = useState<number | null>(null)
  const refreshInFlightRef = useRef<Promise<void> | null>(null)
  const silentRenewInFlightRef = useRef<Promise<boolean> | null>(null)

  /** Rotates access + refresh cookies without toggling loading (avoids `proxy` rejecting stale JWT on reload). */
  const silentRenewAccessCookies = useCallback((): Promise<boolean> => {
    if (silentRenewInFlightRef.current) return silentRenewInFlightRef.current
    const run = (async () => {
      try {
        const r = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })
        return r.ok
      } catch {
        return false
      }
    })().finally(() => {
      silentRenewInFlightRef.current = null
    })
    silentRenewInFlightRef.current = run
    return run
  }, [])

  const refresh = useCallback(async (options?: AccountRefreshOptions) => {
    const silent = options?.silent === true

    if (!silent && refreshInFlightRef.current) {
      return refreshInFlightRef.current
    }

    const run = (async () => {
      setError(null)
      if (!silent) {
        setLoading(true)
      }
      try {
        let res = await fetch('/api/auth/me', { credentials: 'include' })
        let text = await res.text()

        if (res.status === 401) {
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          })
          const refreshText = await refreshRes.text()
          const refreshData = parseMeJson(refreshText)

          if (!refreshRes.ok) {
            setUser(null)
            setProfile(null)
            setLastMeStatus(refreshRes.status)
            if (refreshRes.status === 429) {
              setError(messageFromMeBody(refreshData) ?? 'Demasiados intentos. Probá más tarde.')
            } else if (refreshRes.status >= 500) {
              setError('No pudimos renovar la sesión. Probá de nuevo en unos minutos.')
            } else {
              setError(messageFromMeBody(refreshData) ?? 'Tenés que iniciar sesión de nuevo.')
            }
            return
          }

          res = await fetch('/api/auth/me', { credentials: 'include' })
          text = await res.text()
        }

        const data = parseMeJson(text)
        setLastMeStatus(res.status)

        if (!res.ok) {
          setUser(null)
          setProfile(null)
          if (res.status === 401) {
            setError('Tenés que iniciar sesión de nuevo.')
          } else if (res.status === 502 || res.status === 503 || res.status === 504) {
            setError(
              messageFromMeBody(data) ??
                'El servidor tardó demasiado o no está disponible. Probá de nuevo en unos segundos.'
            )
          } else if (res.status >= 500) {
            setError(
              messageFromMeBody(data) ??
                'No pudimos cargar tu cuenta. Probá de nuevo en unos minutos.'
            )
          } else {
            setError(messageFromMeBody(data) ?? 'No pudimos cargar tu cuenta.')
          }
          return
        }
        const u = data.user
        // Cuerpo 200 pero no es lo que esperamos (proxy/html, middleware, intermediario que muta JSON).
        // No usar 5xx arbitrarios: SessionGate trata 502/503/504/429 como recuperable.
        if (!u?.id || typeof u.email !== 'string' || u.email.length === 0) {
          setUser(null)
          setProfile(null)
          setLastMeStatus(422)
          setError('Respuesta inválida al cargar la cuenta.')
          return
        }
        setUser({
          id: u.id,
          email: u.email,
          emailVerified:
            u.emailVerified === null || u.emailVerified === undefined
              ? null
              : String(u.emailVerified),
        })
        setProfile(data.profile ?? null)
      } catch {
        setUser(null)
        setProfile(null)
        setLastMeStatus(null)
        setError('No pudimos cargar tu cuenta. Comprobá tu conexión.')
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    })()

    if (!silent) {
      refreshInFlightRef.current = run
      await run.finally(() => {
        refreshInFlightRef.current = null
      })
    } else {
      await run
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!user) return
    const tick = () => {
      void silentRenewAccessCookies()
    }
    const id = window.setInterval(tick, SILENT_REFRESH_INTERVAL_MS)
    const onFocus = () => {
      tick()
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [user, silentRenewAccessCookies])

  const value = useMemo(
    () => ({ user, profile, loading, error, lastMeStatus, refresh }),
    [user, profile, loading, error, lastMeStatus, refresh]
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext)
  if (!ctx) {
    throw new Error('useAccount debe usarse dentro de AccountProvider')
  }
  return ctx
}
