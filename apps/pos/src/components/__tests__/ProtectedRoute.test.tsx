import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { ProtectedRoute } from '@/components/ProtectedRoute'

// Characterization test (PR3, route-tree migration): locks in the spec
// scenario "Unauthenticated access redirects" — `GIVEN no valid
// session/token, WHEN the user navigates to a protected route, THEN the
// router redirects to /login; the protected view does not render."
//
// `ProtectedRoute` (reused as-is from the pre-migration Next.js version,
// only its `next/navigation` primitives were swapped to
// `@tanstack/react-router`) performs this redirect as a client-side
// `useEffect`, not a router `beforeLoad` guard, so this needs an actual
// render (via `@testing-library/react`) rather than a router-only
// `router.load()` check.
vi.mock('@/hooks/useUser', () => ({
  useUser: () => ({ data: undefined, isLoading: false }),
}))

afterEach(() => cleanup())

function buildTestRouter(initialPath: string) {
  const rootRoute = createRootRoute()
  const protectedRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/dashboard',
    component: () => (
      <ProtectedRoute>
        <div>Protected dashboard content</div>
      </ProtectedRoute>
    ),
  })
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => <div>Login screen</div>,
  })
  const routeTree = rootRoute.addChildren([protectedRoute, loginRoute])

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })
}

describe('ProtectedRoute (unauthenticated redirect)', () => {
  it('redirects to /login and does not render the protected view', async () => {
    const router = buildTestRouter('/dashboard')
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login')
    })

    // Plain chai assertions (no `@testing-library/jest-dom` custom matchers)
    // so this test does not depend on that package's ambient type
    // augmentation resolving correctly. `getByText` already throws if the
    // element is missing, so a successful call is proof of presence.
    expect(screen.getByText('Login screen')).not.toBeNull()
    expect(screen.queryByText('Protected dashboard content')).toBeNull()
  })

  it('carries the original path as the `next` search param', async () => {
    const router = buildTestRouter('/dashboard')
    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login')
    })

    expect(router.state.location.search).toMatchObject({ next: '/dashboard' })
  })
})
