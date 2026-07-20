import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from '@tanstack/react-router'
import { routeTree } from '../routeTree.gen'

describe('Vite + TanStack Router scaffold boot', () => {
  it('resolves "/" to the root index route', async () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })

    await router.load()

    const matchedRouteIds = router.state.matches.map((match) => match.routeId)
    // PR3 migrated the real landing page into the `(public)` route group,
    // replacing the PR2 scaffold placeholder that lived at the bare `/` id.
    expect(matchedRouteIds).toContain('/(public)/')
  })

  it('resolves an unknown path to the not-found route instead of crashing', async () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/this-route-does-not-exist'] }),
    })

    await router.load()

    expect(router.state.statusCode).toBe(404)
  })
})
