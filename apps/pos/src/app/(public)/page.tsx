import { LandingPage } from "@/views/LandingPage";

// `LandingPage` now uses `@tanstack/react-router`'s `Link` (PR3 route-tree
// migration), which requires a `<RouterProvider>` context that only exists
// in the Vite/TanStack app, not in this coexisting Next.js tree. Force this
// route to render dynamically (skip Next's static prerendering) so `next
// build` keeps succeeding instead of crashing during static generation.
export const dynamic = "force-dynamic";

export default function Page() {
  return <LandingPage />;
}
