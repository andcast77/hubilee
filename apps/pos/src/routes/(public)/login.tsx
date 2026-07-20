import { createFileRoute } from '@tanstack/react-router'
import { LoginPage } from '@/views/LoginPage'

// The Next.js version wraps `LoginPage` in a `<Suspense>` boundary because
// `useSearchParams()` requires one under the App Router. TanStack Router
// resolves search params synchronously from route state (no Suspense
// requirement), so the wrapper is not needed here.
export const Route = createFileRoute('/(public)/login')({
  component: LoginPage,
})
