import { RegisterVerifyPage } from "@/views/RegisterVerifyPage";

// `RegisterVerifyPage` now uses `@tanstack/react-router` (PR3 route-tree
// migration: `useNavigate`/`useSearch` replace `next/navigation`), which
// requires a `<RouterProvider>` context only present in the Vite/TanStack
// app. Force dynamic rendering so `next build` keeps succeeding instead of
// crashing during static generation.
export const dynamic = "force-dynamic";

export default function Page() {
  return <RegisterVerifyPage />;
}
