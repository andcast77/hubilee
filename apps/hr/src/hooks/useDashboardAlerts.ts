'use client'

import { useState, useEffect, useCallback } from 'react'
import { hrApi } from '@/lib/api/client'

export type DashboardAlertItem = {
  type: 'ABSENCE' | 'LATE' | 'LICENSE_EXPIRING' | 'SHIFT_GAP' | 'INFO'
  priority: 'high' | 'medium' | 'low'
  title: string
  message: string
  meta?: Record<string, string>
}

export function useDashboardAlerts() {
  const [alerts, setAlerts] = useState<DashboardAlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await hrApi.get<{ success?: boolean; alerts?: DashboardAlertItem[] }>('/dashboard/alerts')
      setAlerts(res.alerts ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  useEffect(() => {
    const h = () => fetchAlerts()
    window.addEventListener('hr-dashboard-refresh', h)
    return () => window.removeEventListener('hr-dashboard-refresh', h)
  }, [fetchAlerts])

  return { alerts, loading, error, refetch: fetchAlerts }
}
