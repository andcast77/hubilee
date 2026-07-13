import { RegisterPage } from "@/views/RegisterPage";

// `RegisterPage` now uses `@tanstack/react-router`'s `Link` (PR3 route-tree
// migration), which requires a `<RouterProvider>` context only present in
// the Vite/TanStack app. Force dynamic rendering so `next build` keeps
// succeeding instead of crashing during static generation.
export const dynamic = "force-dynamic";

export default function Page() {
  return <RegisterPage />;
}
