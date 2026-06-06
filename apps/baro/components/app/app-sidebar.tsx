'use client'

import type { ComponentType, SVGProps } from 'react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { site } from '@/locales/site'
import {
  IconFile,
  IconHome,
  IconLifebuoy,
  IconMail,
  IconRuler,
  IconUsers,
} from '@/components/app/icons'

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

type AppSidebarProps = {
  mobileOpen: boolean
  onNavigate?: () => void
  className?: string
  accountName?: string
  accountInitials?: string
  accountRole?: string
}

type NavCtx = { pathname: string; routeHash: string }

const navGeneral: {
  key: string
  href: React.ComponentProps<typeof Link>['href']
  label: string
  icon: IconComponent
  isActive: (c: NavCtx) => boolean
}[] = [
  {
    key: 'inicio',
    href: '/dashboard',
    label: 'Inicio',
    icon: IconHome,
    isActive: ({ pathname, routeHash }) => pathname === '/dashboard' && routeHash === '',
  },
  {
    key: 'expedientes',
    href: '/expedientes',
    label: 'Expedientes',
    icon: IconRuler,
    isActive: ({ pathname }) => pathname.startsWith('/expedientes'),
  },
  {
    key: 'profesionales',
    href: '/profesionales',
    label: 'Profesionales',
    icon: IconUsers,
    isActive: ({ pathname }) => pathname.startsWith('/profesionales'),
  },
  {
    key: 'formularios',
    href: '/formularios',
    label: 'Formularios',
    icon: IconFile,
    isActive: ({ pathname }) => pathname.startsWith('/formularios'),
  },
]

const navAyuda: { href: string; label: string; icon: IconComponent; hashMatch: '' | 'contacto' }[] =
  [
    { href: '/soporte', label: 'Soporte', icon: IconLifebuoy, hashMatch: '' },
    { href: '/soporte#contacto', label: 'Contacto', icon: IconMail, hashMatch: 'contacto' },
  ]

function NavItem({
  href,
  label,
  Icon,
  active,
  onClick,
}: {
  href: React.ComponentProps<typeof Link>['href']
  label: string
  Icon: IconComponent
  active: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[background-color,color,transform] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-sidebar-bg)] active:scale-[0.99] ${
        active
          ? 'bg-white/[0.07] text-[var(--app-sidebar-active-fg)]'
          : 'text-[var(--app-sidebar-muted)] hover:bg-[var(--app-sidebar-hover-bg)] hover:text-[var(--app-sidebar-fg)]'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      {active ? (
        <span
          className="absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent-bright)] shadow-[0_0_12px_rgb(212_175_55/0.55)]"
          aria-hidden
        />
      ) : null}
      <Icon className="relative h-5 w-5 shrink-0 opacity-90 transition-transform duration-200 group-hover:scale-105" />
      <span className="relative">{label}</span>
    </Link>
  )
}

export function AppSidebar({
  mobileOpen,
  onNavigate,
  className = '',
  accountName = 'Carlos Alexander Balmaceda',
  accountInitials = 'CB',
  accountRole = 'Usuario',
}: AppSidebarProps) {
  void accountRole
  const pathname = usePathname()
  const [routeHash, setRouteHash] = useState('')

  useEffect(() => {
    const sync = () => {
      const raw = window.location.hash.replace(/^#/, '')
      const first = raw.split('#')[0] ?? ''
      setRouteHash(first)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [pathname])

  const navCtx: NavCtx = { pathname, routeHash }

  return (
    <aside
      id="app-sidebar-nav"
      className={`flex min-h-0 w-[min(17.5rem,88vw)] flex-col border-[var(--app-sidebar-border)] bg-[var(--app-sidebar-bg)] text-[var(--app-sidebar-fg)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:max-h-svh max-lg:border-r max-lg:shadow-2xl lg:z-0 lg:h-full lg:max-h-full lg:w-[15.5rem] lg:shrink-0 lg:rounded-2xl lg:border lg:shadow-[0_25px_60px_-15px_rgb(0_0_0/0.45)] lg:ring-1 lg:ring-white/10 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${className}`}
      aria-label="Navegación principal"
    >
      <div className="relative shrink-0 overflow-hidden px-4 pb-4 pt-5">
        <div
          className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-[var(--accent-bright)]/15 blur-2xl app-live-pulse"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-6 left-1/2 h-24 w-40 -translate-x-1/2 rounded-full bg-[rgb(100_170_185)]/10 blur-2xl"
          aria-hidden
        />
        <Link
          href="/"
          className="relative block text-[0.95rem] font-semibold tracking-tight text-[var(--app-sidebar-fg)] outline-none transition-colors hover:text-[var(--accent-bright)] focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-sidebar-bg)]"
          onClick={onNavigate}
        >
          {site.brand}
        </Link>
      </div>

      <nav
        className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 pb-4 [scrollbar-gutter:stable]"
        aria-label="Secciones"
      >
        <div>
          <p className="px-3 pb-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--app-sidebar-muted)]/90">
            Trabajo
          </p>
          <ul className="flex flex-col gap-0.5">
            {navGeneral.map((item) => (
              <li key={item.key}>
                <NavItem
                  href={item.href}
                  label={item.label}
                  Icon={item.icon}
                  active={item.isActive(navCtx)}
                  onClick={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="relative mt-auto shrink-0 border-t border-white/10 px-3 pb-3 pt-3">
        <p className="px-3 pb-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--app-sidebar-muted)]/90">
          Ayuda
        </p>
        <ul className="flex flex-col gap-0.5">
          {navAyuda.map((item) => {
            const onSoporte = pathname === '/soporte'
            const active =
              onSoporte &&
              (item.hashMatch === 'contacto' ? routeHash === 'contacto' : routeHash !== 'contacto')
            return (
              <li key={item.href}>
                <NavItem
                  href={item.href}
                  label={item.label}
                  Icon={item.icon}
                  active={active}
                  onClick={onNavigate}
                />
              </li>
            )
          })}
        </ul>
      </div>

      <div className="relative shrink-0 border-t border-white/10 p-3">
        <Link
          href="/cuenta"
          onClick={onNavigate}
          className={`relative flex items-center gap-3 rounded-xl px-2 py-2 outline-none transition-[background-color,color,transform] focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-sidebar-bg)] active:scale-[0.99] ${
            pathname.startsWith('/cuenta')
              ? 'bg-white/[0.07] text-[var(--app-sidebar-active-fg)]'
              : 'text-[var(--app-sidebar-fg)] hover:bg-[var(--app-sidebar-hover-bg)]'
          }`}
          aria-current={pathname.startsWith('/cuenta') ? 'page' : undefined}
        >
          {pathname.startsWith('/cuenta') ? (
            <span
              className="absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent-bright)] shadow-[0_0_12px_rgb(212_175_55/0.55)]"
              aria-hidden
            />
          ) : null}
          <span
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgb(255_255_255/0.08)] text-xs font-bold text-[var(--accent-bright)] ring-2 ring-[var(--accent-bright)]/35"
            aria-hidden
          >
            {accountInitials}
          </span>
          <div className="relative min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-snug">{accountName}</p>
          </div>
        </Link>
      </div>
    </aside>
  )
}
