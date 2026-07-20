import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from '@tanstack/react-router'
import { routeTree } from '../routeTree.gen'

// Characterization test (PR3, route-tree migration): every route migrated
// from `apps/pos/src/app/**` (Next.js App Router) must have a reachable
// TanStack Router equivalent. This only asserts router-level matching (no
// component rendering, no auth state) — it locks in that the route tree
// itself resolves each path to a real route instead of falling through to
// the not-found route. Protected-route auth enforcement is covered
// separately (see `protected-route.test.tsx`), because that redirect is
// implemented as a client-side effect inside the rendered component tree,
// not as a router-level `beforeLoad` guard.
const PUBLIC_ROUTES = ['/', '/login', '/register', '/register/verify', '/terms']

const APP_ROUTES = [
  '/dashboard',
  '/account',
  '/categories',
  '/pos',
  '/admin/backup',
  '/admin/loyalty',
  '/admin/settings',
  '/admin/users',
  '/admin/users/new',
  '/admin/users/test-id-1',
  '/customers',
  '/customers/new',
  '/customers/test-id-1',
  '/inventory',
  '/inventory/adjustments',
  '/inventory/low-stock',
  '/products',
  '/products/new',
  '/products/test-id-1',
  '/reports',
  '/reports/inventory',
  '/reports/sales',
  '/sales/test-id-1',
  '/suppliers',
  '/suppliers/new',
  '/suppliers/test-id-1',
]

async function resolves(path: string): Promise<boolean> {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  return router.state.statusCode !== 404
}

describe('route reachability (migrated route tree)', () => {
  it.each(PUBLIC_ROUTES)('resolves public route %s', async (path) => {
    expect(await resolves(path)).toBe(true)
  })

  it.each(APP_ROUTES)('resolves protected route %s', async (path) => {
    expect(await resolves(path)).toBe(true)
  })

  it('does not resolve an unmapped path', async () => {
    expect(await resolves('/this-route-does-not-exist')).toBe(false)
  })
})
