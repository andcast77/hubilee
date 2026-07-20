'use client'

import { useState, useEffect, useCallback } from 'react'

export interface UseOfflineReturn {
  isOnline: boolean
  isOffline: boolean
  isServiceWorkerReady: boolean
  isSyncing: boolean
  syncProgress: null
  syncError: string | null
  connectivityStatus: { isOnline: boolean }
  isLikelyOnline: boolean
  isSlowConnection: boolean
  isVerySlowConnection: boolean
  syncOfflineQueue: () => Promise<boolean>
  syncAll: () => Promise<{ success: boolean; synced: Record<string, number>; errors: string[] }>
  checkConnectivity: () => Promise<{ isOnline: boolean }>
  lastSyncTime: number | null
}

export function useOffline(): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const syncAll = useCallback(async () => {
    return {
      success: true,
      synced: {} as Record<string, number>,
      errors: [] as string[],
    }
  }, [])

  return {
    isOnline,
    isOffline: !isOnline,
    isServiceWorkerReady: false,
    isSyncing: false,
    syncProgress: null,
    syncError: null,
    connectivityStatus: { isOnline },
    isLikelyOnline: isOnline,
    isSlowConnection: false,
    isVerySlowConnection: false,
    syncOfflineQueue: async () => false,
    syncAll,
    checkConnectivity: async () => ({ isOnline }),
    lastSyncTime: null,
  }
}
