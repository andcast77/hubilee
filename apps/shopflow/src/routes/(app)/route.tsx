import { createFileRoute, Outlet } from '@tanstack/react-router'
import ProtectedAppLayout from '@/app/(app)/ProtectedAppLayout'

// Pathless layout route for the protected `(app)` route group (mirrors
// `src/app/(app)/layout.tsx` in the coexisting Next.js app). Reuses
// `ProtectedAppLayout` as-is: the auth gate (`ProtectedRoute`), session
// gate, module guard, company/store context providers, and sidebar shell
// are unchanged — only the Next-specific primitives *inside* that
// component tree (`next/navigation`) are swapped to TanStack equivalents.
export const Route = createFileRoute('/(app)')({
  component: AppLayoutComponent,
})

function AppLayoutComponent() {
  return (
    <ProtectedAppLayout>
      <Outlet />
    </ProtectedAppLayout>
  )
}
