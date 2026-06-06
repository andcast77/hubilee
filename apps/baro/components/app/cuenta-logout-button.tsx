'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAccount } from '@/components/app/account-context'

export function CuentaLogoutButton() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAccount()
  const [pending, setPending] = useState(false)

  if (!user) return null

  async function logout() {
    setPending(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      const from = pathname && pathname !== '/login' ? `?from=${encodeURIComponent(pathname)}` : ''
      router.replace(`/login${from}`)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={pending}
      className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-foreground)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--color-muted-bg)] disabled:opacity-60 sm:px-4 sm:py-2 sm:text-sm"
    >
      {pending ? 'Cerrando…' : 'Cerrar sesión'}
    </button>
  )
}
