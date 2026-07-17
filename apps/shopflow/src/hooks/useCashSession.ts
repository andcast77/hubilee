import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listCashRegisters,
  createCashRegister as createCashRegisterApi,
  listCashSessions,
  openCashSession as openCashSessionApi,
  closeCashSession as closeCashSessionApi,
  getCashSessionReport,
} from '@/lib/services/cashSessionService'
import type {
  CreateCashRegisterInput,
  OpenCashSessionInput,
  CloseCashSessionInput,
} from '@/lib/validations/cashSession'
import { CashSessionStatus } from '@/types'

const CASH_SESSIONS_QUERY_KEY = 'cash-sessions'

export function useCashRegisters(storeId?: string | null) {
  return useQuery({
    queryKey: ['cash-registers', storeId],
    queryFn: () => listCashRegisters(storeId),
    enabled: !!storeId,
  })
}

export function useCreateCashRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCashRegisterInput) => createCashRegisterApi(data),
    onSuccess: (_register, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cash-registers', variables.storeId] })
    },
  })
}

/** The store's currently OPEN session across all of its registers, if any (the kiosco/direct screen treats a store as having one active caja at a time). */
export function useOpenCashSession(storeId?: string | null) {
  const query = useQuery({
    queryKey: [CASH_SESSIONS_QUERY_KEY, storeId, CashSessionStatus.OPEN],
    queryFn: () => listCashSessions({ storeId, status: CashSessionStatus.OPEN }),
    enabled: !!storeId,
  })

  return {
    ...query,
    session: query.data && query.data.length > 0 ? query.data[0] : null,
  }
}

export function useOpenCashSessionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: OpenCashSessionInput) => openCashSessionApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CASH_SESSIONS_QUERY_KEY] })
    },
  })
}

export function useCloseCashSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CloseCashSessionInput }) => closeCashSessionApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CASH_SESSIONS_QUERY_KEY] })
    },
  })
}

/** Live arqueo preview while OPEN, persisted arqueo once CLOSED. */
export function useCashSessionReport(id?: string | null) {
  return useQuery({
    queryKey: ['cash-session-report', id],
    queryFn: () => getCashSessionReport(id as string),
    enabled: !!id,
  })
}
