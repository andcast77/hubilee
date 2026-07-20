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
import { ApiError } from '@hubilee/shared'
import type { ApiResponse, BaroMeResponse } from '@hubilee/contracts'
import { authApi, baroApi } from '@/lib/api/client'

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
  /** Último código HTTP relevante: `GET /v1/baro/me`, o refresh si falló antes del segundo `/me`. */
  lastMeStatus: number | null
  refresh: (options?: AccountRefreshOptions) => Promise<void>
}

const AccountContext = createContext<AccountContextValue | null>(null)

/** Access TTL from API JWT config — keep renewal interval below this */
const ACCESS_TTL_MS = 30 * 60 * 1000
const SILENT_REFRESH_INTERVAL_MS = Math.floor(ACCESS_TTL_MS * 0.35)

function messageFromApiError(err: ApiError): string | null {
  if (err.message.length > 0 && err.message !== 'unauthorized') return err.message
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

  const silentRenewAccessCookies = useCallback((): Promise<boolean> => {
    if (silentRenewInFlightRef.current) return silentRenewInFlightRef.current
    const run = (async () => {
      try {
        const r = await authApi.refresh()
        return r.success
      } catch {
        return false
      }
    })().finally(() => {
      silentRenewInFlightRef.current = null
    })
    silentRenewInFlightRef.current = run
    return run
  }, [])

  const applyMeResponse = useCallback((res: ApiResponse<BaroMeResponse>) => {
    const data = res.data
    const u = data?.user
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
    setProfile(data?.profile ?? null)
    setLastMeStatus(200)
  }, [])

  const refresh = useCallback(
    async (options?: AccountRefreshOptions) => {
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
          let res: ApiResponse<BaroMeResponse>
          try {
            res = await baroApi.get<ApiResponse<BaroMeResponse>>('/me')
          } catch (e) {
            if (e instanceof ApiError && e.statusCode === 401) {
              try {
                await authApi.refresh()
              } catch (refreshErr) {
                const status =
                  refreshErr instanceof ApiError ? refreshErr.statusCode : 401
                setUser(null)
                setProfile(null)
                setLastMeStatus(status)
                if (refreshErr instanceof ApiError) {
                  if (status === 429) {
                    setError(messageFromApiError(refreshErr) ?? 'Demasiados intentos. Probá más tarde.')
                  } else if (status >= 500) {
                    setError('No pudimos renovar la sesión. Probá de nuevo en unos minutos.')
                  } else {
                    setError(messageFromApiError(refreshErr) ?? 'Tenés que iniciar sesión de nuevo.')
                  }
                } else {
                  setError('Tenés que iniciar sesión de nuevo.')
                }
                return
              }
              res = await baroApi.get<ApiResponse<BaroMeResponse>>('/me')
            } else {
              throw e
            }
          }

          if (!res.success || !res.data) {
            setUser(null)
            setProfile(null)
            setLastMeStatus(401)
            setError(res.message ?? res.error ?? 'Tenés que iniciar sesión de nuevo.')
            return
          }

          applyMeResponse(res)
        } catch (e) {
          if (e instanceof ApiError) {
            setUser(null)
            setProfile(null)
            setLastMeStatus(e.statusCode)
            if (e.statusCode === 401) {
              setError('Tenés que iniciar sesión de nuevo.')
            } else if (e.statusCode === 502 || e.statusCode === 503 || e.statusCode === 504) {
              setError(
                messageFromApiError(e) ??
                  'El servidor tardó demasiado o no está disponible. Probá de nuevo en unos segundos.'
              )
            } else if (e.statusCode >= 500) {
              setError(
                messageFromApiError(e) ??
                  'No pudimos cargar tu cuenta. Probá de nuevo en unos minutos.'
              )
            } else {
              setError(messageFromApiError(e) ?? 'No pudimos cargar tu cuenta.')
            }
          } else {
            setUser(null)
            setProfile(null)
            setLastMeStatus(null)
            setError('No pudimos cargar tu cuenta. Comprobá tu conexión.')
          }
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
    },
    [applyMeResponse]
  )

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
