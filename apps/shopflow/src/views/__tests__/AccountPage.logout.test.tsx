import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { AccountPage } from '@/views/ShopflowPages'

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

afterEach(() => {
  cleanup()
  authApiPostMock.mockClear()
  clearDesktopSessionMock.mockClear()
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
})
