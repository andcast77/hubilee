'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { site } from '@/locales/site'
import { Button } from '@/components/ui/button'

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="sticky top-0 z-50">
      <div className="hidden border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-muted)] sm:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
          {site.contact.phones.map((p) => (
            <a
              key={p}
              href={`tel:${p.replace(/\s/g, '')}`}
              className="font-medium text-[var(--color-heading)] transition-colors hover:text-[var(--color-accent-bright)]"
            >
              {p}
            </a>
          ))}
          <a
            href={`mailto:${site.contact.email}`}
            className="font-medium text-[var(--color-heading)] transition-colors hover:text-[var(--color-accent-bright)]"
          >
            {site.contact.email}
          </a>
        </div>
      </div>
      <div
        className={`border-b transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
          scrolled
            ? 'border-[var(--color-border)] bg-[var(--color-background)]/95 shadow-[var(--shadow-soft)] backdrop-blur-md'
            : 'border-transparent bg-[var(--color-background)]/85 backdrop-blur-sm'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a
            href="#inicio"
            className="text-lg font-semibold tracking-tight text-[var(--color-heading)] transition-colors hover:text-[var(--color-accent-bright)]"
          >
            {site.brand}
          </a>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {site.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-heading)]"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/login">Ingresar</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
