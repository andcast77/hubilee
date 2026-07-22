import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { AccountPage } from '@/views/POSPages'

// Spec scenario "Logout clears storage" (auth-transport domain, PR4): logout
// must both hit the API (server-side session/blacklist cleanup) AND clear
// any locally stored desktop Bearer tokens (a no-op on web).
const authApiPostMock = vi.fn(async (_endpoint: string) => ({ success: true }))
vi.mock('@/lib/api/client', () => ({
  authApi: { post: (endpoint: string) => authApiPostMock(endpoint) },
}))

const clearDesktopSessionMock = vi.fn(async () => {})
vi.mock('@/lib/platform', () => ({
  clearDesktopSession: () => clearDesktopSessionMock(),
}))

vi.mock('@/hooks/useUser', () => ({
  useUser: () => ({ data: { id: 'user-1', email: 'cajero@test.com' }, isLoading: false }),
}))

vi.mock('@/components/providers/StoreContext', () => ({
  useStoreContextOptional: () => ({ currentStoreId: 'store-1' }),
}))

const useOpenCashSessionsForSwitchMock = vi.fn(() => ({
  data: [] as Array<{ id: string; openedByUserId: string; status: string }>,
  isLoading: false,
}))
vi.mock('@/hooks/useCashSession', () => ({
  useOpenCashSession: () => ({ session: null, isLoading: false }),
  useOpenCashSessionsByStore: () => ({ data: [], isLoading: false }),
  useOpenCashSessionsForSwitch: () => useOpenCashSessionsForSwitchMock(),
}))

afterEach(() => {
  cleanup()
  authApiPostMock.mockClear()
  clearDesktopSessionMock.mockClear()
  useOpenCashSessionsForSwitchMock.mockReset()
  useOpenCashSessionsForSwitchMock.mockReturnValue({ data: [], isLoading: false })
})

function buildTestRouter() {
  const rootRoute = createRootRoute()
  const accountRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/account',
    component: () => <AccountPage />,
  })
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => <div>Login screen</div>,
  })
  const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/dashboard',
    component: () => <div>Dashboard</div>,
  })
  const routeTree = rootRoute.addChildren([accountRoute, loginRoute, dashboardRoute])

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/account'] }),
  })
}

describe('AccountPage logout (desktop session cleanup)', () => {
  it('calls the API logout endpoint and clears the desktop token storage, then redirects to /login', async () => {
    const router = buildTestRouter()
    render(<RouterProvider router={router} />)

    const logoutButton = await screen.findByRole('button', { name: 'Cerrar sesion' })
    fireEvent.click(logoutButton)

    await waitFor(() => {
      expect(authApiPostMock).toHaveBeenCalledWith('/logout')
    })
    await waitFor(() => {
      expect(clearDesktopSessionMock).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login')
    })
  })

  it('blocks Cambiar operador while the current user has OPEN cash (no logout)', async () => {
    useOpenCashSessionsForSwitchMock.mockReturnValue({
      data: [{ id: 'cs-1', openedByUserId: 'user-1', status: 'OPEN' }],
      isLoading: false,
    })

    const router = buildTestRouter()
    render(<RouterProvider router={router} />)

    const switchButton = await screen.findByRole('button', { name: 'Cambiar operador' })
    fireEvent.click(switchButton)

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect((await screen.findByRole('alert')).textContent).toMatch(/cerrar la caja/i)
    expect(authApiPostMock).not.toHaveBeenCalled()
  })

  it('allows Cambiar operador after cash is closed (logout then login)', async () => {
    useOpenCashSessionsForSwitchMock.mockReturnValue({ data: [], isLoading: false })

    const router = buildTestRouter()
    render(<RouterProvider router={router} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar operador' }))

    await waitFor(() => {
      expect(authApiPostMock).toHaveBeenCalledWith('/logout')
    })
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login')
    })
  })
})
