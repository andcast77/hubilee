import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useOpenCashSession } from '@/hooks/useCashSession'
import { CashSessionStatus } from '@/types'

// FIX 1 (pos-cash-session, CRITICAL): a store can have MULTIPLE registers, each with its
// own OPEN session. `useOpenCashSession` must resolve the session for the SPECIFIC register
// the operator selected — not "most-recent OPEN session store-wide" (`query.data[0]`), which
// corrupts arqueo when checkout binds to the wrong register.

const listCashSessionsMock = vi.fn()

vi.mock('@/lib/services/cashSessionService', () => ({
  listCashRegisters: vi.fn(async () => []),
  createCashRegister: vi.fn(),
  listCashSessions: (params: unknown) => listCashSessionsMock(params),
  openCashSession: vi.fn(),
  closeCashSession: vi.fn(),
  getCashSessionReport: vi.fn(),
}))

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('useOpenCashSession (register-aware selection)', () => {
  it('filters by the selected registerId, not just the most-recent store-wide OPEN session', async () => {
    // Register B's session is the most RECENT (would win a naive `data[0]` pick), but the
    // operator selected register A — the hook must resolve register A's session.
    const sessionForRegisterA = {
      id: 'session-A',
      cashRegisterId: 'register-A',
      status: CashSessionStatus.OPEN,
      openingFloat: 100,
      openedAt: '2026-07-17T09:00:00.000Z',
    }
    listCashSessionsMock.mockImplementation(async (params: { cashRegisterId?: string }) => {
      if (params?.cashRegisterId === 'register-A') return [sessionForRegisterA]
      if (params?.cashRegisterId === 'register-B') {
        return [{ id: 'session-B', cashRegisterId: 'register-B', status: CashSessionStatus.OPEN, openingFloat: 999, openedAt: '2026-07-17T10:00:00.000Z' }]
      }
      return []
    })

    const { result } = renderHook(() => useOpenCashSession('store-1', 'register-A'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.session).not.toBeNull())

    expect(result.current.session?.id).toBe('session-A')
    expect(listCashSessionsMock).toHaveBeenCalledWith({
      storeId: 'store-1',
      cashRegisterId: 'register-A',
      status: CashSessionStatus.OPEN,
    })
  })

  it('does not query when no registerId is selected (avoids resolving an ambiguous store-wide session)', () => {
    const { result } = renderHook(() => useOpenCashSession('store-1', null), { wrapper: createWrapper() })

    expect(listCashSessionsMock).not.toHaveBeenCalled()
    expect(result.current.session).toBeNull()
  })
})
