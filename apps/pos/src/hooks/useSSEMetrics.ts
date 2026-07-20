import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { API_URL } from '@/lib/api/client'

const MAX_RECONNECT_DELAY_MS = 30_000
const MAX_RECONNECT_ATTEMPTS = 10
const SSE_SUPPORTED = typeof EventSource !== 'undefined'

export function useSSEMetrics(companyId: string | undefined) {
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)
  const [fallbackToPolling, setFallbackToPolling] = useState(!SSE_SUPPORTED)
  const attemptsRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!companyId || !SSE_SUPPORTED) return

    let cancelled = false

    function connect() {
      if (cancelled) return

      const url = `${API_URL}/v1/events/metrics/${companyId}`
      const es = new EventSource(url, { withCredentials: true })
      esRef.current = es

      es.addEventListener('connected', () => {
        attemptsRef.current = 0
        setConnected(true)
        setFallbackToPolling(false)
      })

      es.addEventListener('sale:created', () => {
        queryClient.invalidateQueries({ queryKey: ['reports'] })
        queryClient.invalidateQueries({ queryKey: ['reports', 'dashboard-metrics'] })
      })

      es.addEventListener('stock:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['reports', 'inventory'] })
        queryClient.invalidateQueries({ queryKey: ['reports', 'stats'] })
        queryClient.invalidateQueries({ queryKey: ['reports', 'dashboard-metrics'] })
      })

      es.onerror = () => {
        es.close()
        esRef.current = null
        setConnected(false)

        if (cancelled) return

        if (attemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setFallbackToPolling(true)
          return
        }

        const delay = Math.min(1_000 * 2 ** attemptsRef.current, MAX_RECONNECT_DELAY_MS)
        attemptsRef.current += 1
        timerRef.current = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
      esRef.current?.close()
      esRef.current = null
      setConnected(false)
    }
  }, [companyId, queryClient])

  return { connected, fallbackToPolling }
}
