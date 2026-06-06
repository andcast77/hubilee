import Link from 'next/link'
import { Suspense } from 'react'
import { AuthForm } from '@/components/auth-form'
import { site } from '@/locales/site'

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Crear cuenta</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
        Registro para el área privada de {site.brand}. La contraseña debe tener al menos 8
        caracteres.
      </p>
      <Suspense fallback={<p className="mt-8 text-sm text-[var(--color-muted)]">Cargando…</p>}>
        <AuthForm mode="register" />
      </Suspense>
      <Link
        href="/"
        className="mt-10 text-center text-sm font-medium text-[var(--color-accent-bright)] underline-offset-4 hover:underline"
      >
        Volver al inicio
      </Link>
    </main>
  )
}
