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

/**
 * The OPEN session for a SPECIFIC register, if any (FIX 1 — a store can have MULTIPLE
 * registers each with its own OPEN session; the caller must pass the operator's selected
 * `registerId`, e.g. via `useSelectedRegisterId`). Deliberately does NOT fall back to
 * "most-recent OPEN session store-wide" — that picked the wrong register's session when
 * more than one register was open, corrupting checkout/settlement's arqueo.
 */
export function useOpenCashSession(storeId?: string | null, registerId?: string | null) {
  const query = useQuery({
    queryKey: [CASH_SESSIONS_QUERY_KEY, storeId, registerId, CashSessionStatus.OPEN],
    queryFn: () => listCashSessions({ storeId, cashRegisterId: registerId ?? undefined, status: CashSessionStatus.OPEN }),
    enabled: !!storeId && !!registerId,
  })

  return {
    ...query,
    session: query.data && query.data.length > 0 ? query.data[0] : null,
  }
}

/** All OPEN sessions for a store, across every register — used to show each register's open/closed state in a register selector (at most one per register, per D5). */
export function useOpenCashSessionsByStore(storeId?: string | null) {
  return useQuery({
    queryKey: [CASH_SESSIONS_QUERY_KEY, storeId, 'all-registers', CashSessionStatus.OPEN],
    queryFn: () => listCashSessions({ storeId, status: CashSessionStatus.OPEN }),
    enabled: !!storeId,
  })
}

/** OPEN sessions company-wide (no store filter) — operator switch gate for current user. */
export function useOpenCashSessionsForSwitch() {
  return useQuery({
    queryKey: [CASH_SESSIONS_QUERY_KEY, 'operator-switch', CashSessionStatus.OPEN],
    queryFn: () => listCashSessions({ status: CashSessionStatus.OPEN }),
  })
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
