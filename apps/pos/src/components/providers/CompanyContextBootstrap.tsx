'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useUser } from '@/hooks/useUser'
import { useSSEMetrics } from '@/hooks/useSSEMetrics'
import { authApi } from '@/lib/api/client'

/**
 * Restores company context when user has preferredCompanyId but JWT had no companyId.
 * API sets new httpOnly session cookie on POST /context.
 */
export function CompanyContextBootstrap({ children }: { children: React.ReactNode }) {
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const restoreDone = useRef(false)

  useSSEMetrics(user?.companyId)

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !user ||
      user.companyId ||
      !user.preferredCompanyId ||
      restoreDone.current
    )
      return

    restoreDone.current = true

    authApi
      .post<{
        success?: boolean
        data?: { companyId?: string; company?: { id: string; name: string } }
        error?: string
      }>('/context', { companyId: user.preferredCompanyId })
      .then((res) => {
        if (res && typeof res === 'object' && res.success && res.data) {
          const newCompanyId = res.data.companyId ?? user.preferredCompanyId
          const newCompany = res.data.company
          queryClient.setQueryData(['currentUser'], (prev: unknown) => {
            if (prev && typeof prev === 'object' && prev !== null) {
              return {
                ...prev,
                companyId: newCompanyId,
                company: newCompany ?? (prev as { company?: unknown }).company,
              }
            }
            return prev
          })
        }
      })
      .catch(() => {
        restoreDone.current = false
      })
  }, [user, queryClient])

  return <>{children}</>
}
