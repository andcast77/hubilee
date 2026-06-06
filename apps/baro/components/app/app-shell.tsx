'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useAccount } from '@/components/app/account-context'
import { AppSidebar } from '@/components/app/app-sidebar'
import { site } from '@/locales/site'
import {
  initialsFromDisplayName,
  professionalTitleLabel,
  sidebarAccountName,
} from '@/lib/professional/display'

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, profile, loading: accountLoading } = useAccount()

  const sidebarAccount = useMemo(() => {
    const email = user?.email ?? ''
    const name = sidebarAccountName(profile?.displayName, user?.email)
    const initials = initialsFromDisplayName(profile?.displayName, email)
    const role = profile
      ? professionalTitleLabel(profile.professionalTitle, profile.titleGrammarGender)
      : 'Usuario'
    return { name, initials, role }
  }, [user?.email, profile])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  return (
    <div className="app-shell-canvas flex h-svh max-h-svh min-h-0 flex-col overflow-hidden lg:flex-row">
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-[var(--background)] focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--foreground)] focus:shadow-[var(--shadow-soft)]"
      >
        Saltar al contenido
      </a>

      <div className="flex shrink-0 flex-col lg:flex lg:h-svh lg:min-h-0 lg:items-stretch lg:py-2 lg:pl-2">
        <AppSidebar
          mobileOpen={mobileOpen}
          onNavigate={() => setMobileOpen(false)}
          accountName={accountLoading ? 'Cargando…' : sidebarAccount.name}
          accountInitials={accountLoading ? '…' : sidebarAccount.initials}
          accountRole={accountLoading ? '…' : sidebarAccount.role}
        />
      </div>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-[rgb(12_10_9/0.45)] backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="flex h-svh min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:h-svh lg:py-2 lg:pr-2 lg:pl-1">
        <div className="flex shrink-0 items-center gap-2 bg-[var(--app-main-bg)]/90 px-4 py-3 backdrop-blur-md lg:hidden">
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="app-sidebar-nav"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--background)] p-2.5 text-[var(--color-heading)] shadow-[var(--shadow-soft)] outline-none transition-colors hover:bg-[var(--color-muted-bg)] focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="sr-only">Abrir o cerrar menú</span>
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-sm font-semibold tracking-tight text-[var(--color-heading)]">
            {mobileOpen ? 'Navegación' : `${site.brand.split(/\s+/)[0]} · panel`}
          </span>
        </div>

        <div
          id="app-main"
          className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden bg-[rgb(255_255_255/0.78)] shadow-[var(--shadow-soft)] backdrop-blur-md lg:rounded-2xl lg:border lg:border-[var(--color-border)] lg:ring-1 lg:ring-[var(--app-panel-ring)] px-4 py-6 sm:px-5 sm:py-8 lg:px-6 lg:py-8"
        >
          {children}
        </div>
      </div>
    </div>
  )
}
