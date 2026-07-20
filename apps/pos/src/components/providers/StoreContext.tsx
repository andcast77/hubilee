'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useUser } from '@/hooks/useUser'
import { getStores } from '@/lib/services/storeService'

const STORAGE_KEY_PREFIX = 'pos_store_'

export type StoreOption = {
  id: string
  name: string
  code: string
  address?: string | null
  phone?: string | null
  email?: string | null
  active: boolean
}

type RawStore = {
  id: string
  name: string
  code: string
  address?: string | null
  phone?: string | null
  email?: string | null
  active?: boolean
}

type StoreContextValue = {
  stores: StoreOption[]
  isLoading: boolean
  isError: boolean
  currentStoreId: string | null
  setCurrentStoreId: (id: string | null) => void
  /** For reports: "all" = all stores (admin), or a store id */
  reportStoreId: string | null
  setReportStoreId: (id: string | null) => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { data: user } = useUser()
  const companyId = user?.companyId ?? null
  const isStoreAdmin = user?.membershipRole === 'OWNER' || user?.membershipRole === 'ADMIN' || user?.isSuperuser

  const [currentStoreId, setCurrentStoreIdState] = useState<string | null>(null)
  const [reportStoreId, setReportStoreId] = useState<string | null>(null)

  const { data: storesData, isLoading, isError } = useQuery({
    queryKey: ['stores', companyId],
    queryFn: () => getStores(true),
    enabled: !!companyId,
  })

  const stores = useMemo((): StoreOption[] => {
    if (!Array.isArray(storesData)) return []
    return (storesData as RawStore[]).map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      address: s.address ?? null,
      phone: s.phone ?? null,
      email: s.email ?? null,
      active: s.active ?? true,
    }))
  }, [storesData])

  const setCurrentStoreId = useCallback((id: string | null) => {
    setCurrentStoreIdState(id)
    if (typeof window !== 'undefined') {
      window.__POS_STORE_ID = id ?? undefined
    }
  }, [])

  useEffect(() => {
    if (!companyId) {
      setCurrentStoreIdState(null)
      setReportStoreId(null)
      if (typeof window !== 'undefined') window.__POS_STORE_ID = undefined
      return
    }
    const key = `${STORAGE_KEY_PREFIX}${companyId}`
    const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null
    const initial = stored || null
    setCurrentStoreIdState(initial)
    if (typeof window !== 'undefined') {
      window.__POS_STORE_ID = initial ?? undefined
    }
  }, [companyId])

  useEffect(() => {
    if (!companyId || !currentStoreId) return
    const key = `${STORAGE_KEY_PREFIX}${companyId}`
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, currentStoreId)
    }
  }, [companyId, currentStoreId])

  useEffect(() => {
    if (!companyId || isLoading) return
    const activeStores = stores.filter((s) => s.active)
    if (activeStores.length === 0) return

    const currentIsValid = currentStoreId
      ? activeStores.some((s) => s.id === currentStoreId)
      : false

    const fallbackStoreId = currentIsValid ? currentStoreId : activeStores[0].id

    if (!currentIsValid) {
      setCurrentStoreId(fallbackStoreId)
    }

    if (!isStoreAdmin && reportStoreId !== fallbackStoreId) {
      setReportStoreId(fallbackStoreId)
    }
  }, [companyId, isLoading, stores, currentStoreId, reportStoreId, isStoreAdmin, setCurrentStoreId])

  const value = useMemo<StoreContextValue>(
    () => ({
      stores,
      isLoading,
      isError,
      currentStoreId,
      setCurrentStoreId,
      reportStoreId,
      setReportStoreId,
    }),
    [stores, isLoading, isError, currentStoreId, setCurrentStoreId, reportStoreId]
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStoreContext() {
  const ctx = useContext(StoreContext)
  if (!ctx) {
    throw new Error('useStoreContext must be used within StoreProvider')
  }
  return ctx
}

/** Optional hook: returns context or null if outside provider (e.g. admin settings). */
export function useStoreContextOptional() {
  return useContext(StoreContext)
}
