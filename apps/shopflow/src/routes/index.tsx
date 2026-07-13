import { createFileRoute } from '@tanstack/react-router'

// Placeholder root route for the Vite + TanStack Router scaffold (PR2).
// The real Shopflow home/login screen (`src/app/(public)/page.tsx` today)
// is migrated in PR3 (route-tree migration), not in this slice.
export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6">
      <h1 className="text-2xl font-semibold">Shopflow</h1>
      <p className="text-slate-600">
        Vite + TanStack Router scaffold — route migration pending (PR3).
      </p>
    </div>
  )
}
