import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/providers/query-provider'
import { ServiceInitializer } from '@/components/providers/ServiceInitializer'

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: RootNotFoundComponent,
})

function RootComponent() {
  return (
    <QueryProvider>
      <ServiceInitializer />
      <Toaster richColors position="top-center" closeButton />
      <Outlet />
    </QueryProvider>
  )
}

function RootNotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6">
      <p className="text-slate-600">Página no encontrada.</p>
      <Link to="/" className="text-indigo-600 hover:underline">
        Volver al inicio
      </Link>
    </div>
  )
}
