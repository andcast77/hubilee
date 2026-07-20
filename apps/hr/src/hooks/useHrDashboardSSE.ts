'use client'

import { useEffect, useRef } from 'react'
import { API_URL } from '@/lib/api/client'

const SSE_SUPPORTED = typeof EventSource !== 'undefined'

/**
 * Subscribes to company SSE and runs onInvalidate when Hr dashboard data may have changed (PLAN-17).
 */
export function useHrDashboardSSE(companyId: string | null | undefined, onInvalidate: () => void) {
  const cbRef = useRef(onInvalidate)
  cbRef.current = onInvalidate

  useEffect(() => {
    if (!companyId || !SSE_SUPPORTED) return

    const url = `${API_URL}/v1/events/metrics/${companyId}`
    const es = new EventSource(url, { withCredentials: true })

    const handler = () => {
      cbRef.current()
    }

    es.addEventListener('hr:dashboard:invalidate', handler)

    es.onerror = () => {
      es.close()
    }

    return () => {
      es.removeEventListener('hr:dashboard:invalidate', handler)
      es.close()
    }
  }, [companyId])
}
