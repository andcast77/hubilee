'use client'

import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/lib/api/client'

export type CompanyOption = {
  id: string
  name: string
  workifyEnabled: boolean
  posEnabled: boolean
}

async function fetchCompanies(): Promise<CompanyOption[]> {
  const res = await authApi.get<{ success: boolean; data?: CompanyOption[]; error?: string }>('/companies')
  if (!res || typeof res !== 'object' || !('success' in res) || !res.success) {
    throw new Error((res as { error?: string })?.error ?? 'Error al cargar empresas')
  }
  const data = (res as { data?: CompanyOption[] }).data ?? []
  return data
}

/**
 * Lista de empresas para el usuario actual (todas si es superuser).
 * Usar cuando el usuario sea superuser o no tenga companyId para mostrar selector de empresa.
 */
export function useCompanies(enabled: boolean) {
  return useQuery({
    queryKey: ['auth', 'companies'],
    queryFn: fetchCompanies,
    enabled,
  })
}
