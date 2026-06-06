import Link from 'next/link'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

type StatCardProps = {
  title: string
  value: string | number
  icon: ReactNode
  actionLabel?: string
  actionHref?: string
  variant?: 'default' | 'spotlight'
  className?: string
  kicker?: string
}

export function StatCard({
  title,
  value,
  icon,
  actionLabel,
  actionHref,
  variant = 'default',
  className = '',
  kicker,
}: StatCardProps) {
  const isSpotlight = variant === 'spotlight'

  return (
    <Card
      className={`relative border py-0 gap-0 transition-[transform,box-shadow] duration-300 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[var(--shadow-soft)] motion-reduce:hover:translate-y-0 ${
        isSpotlight
          ? 'border-[rgb(255_255_255/0.08)] bg-[var(--app-spotlight)] text-[var(--app-sidebar-fg)] shadow-[0_12px_32px_-16px_rgb(0_0_0/0.45)] ring-1 ring-[var(--accent-bright)]/15'
          : 'border-[var(--color-border)] bg-[var(--background)]/90 shadow-[var(--shadow-soft)] ring-1 ring-[var(--app-panel-ring)] backdrop-blur-sm'
      } ${className}`}
    >
      <CardContent className="px-3.5 py-3 sm:px-4 sm:py-3.5">
        {!isSpotlight ? (
          <div
            className="pointer-events-none absolute -right-4 -top-8 h-20 w-20 rounded-full bg-[var(--accent-bright)]/[0.06] blur-xl"
            aria-hidden
          />
        ) : (
          <div
            className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-[var(--accent-bright)]/12 blur-2xl"
            aria-hidden
          />
        )}
        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0">
            {kicker ? (
              <p
                className={`text-[0.6rem] font-bold uppercase tracking-[0.12em] ${isSpotlight ? 'text-[var(--accent-bright)]/90' : 'text-[var(--color-muted)]'}`}
              >
                {kicker}
              </p>
            ) : null}
            <p
              className={`text-xs font-medium leading-tight ${isSpotlight ? 'text-[var(--app-sidebar-muted)]' : 'text-[var(--color-muted)]'} ${kicker ? 'mt-0.5' : ''}`}
            >
              {title}
            </p>
            <p
              className={`mt-1 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl ${isSpotlight ? 'text-[var(--app-sidebar-fg)]' : 'text-[var(--color-heading)]'}`}
            >
              {value}
            </p>
          </div>
          <div
            className={`shrink-0 rounded-lg p-1.5 sm:p-2 ${isSpotlight ? 'bg-[rgb(255_255_255/0.08)] text-[var(--accent-bright)]' : 'bg-[var(--accent-soft)] text-[var(--accent-bright)]'}`}
          >
            {icon}
          </div>
        </div>
        {actionLabel && actionHref ? (
          <Link
            href={actionHref}
            className="relative mt-2 inline-flex items-center text-xs font-semibold text-[var(--accent-bright)] underline-offset-4 transition-colors hover:underline"
          >
            {actionLabel}
            <span className="ml-0.5" aria-hidden>
              →
            </span>
          </Link>
        ) : null}
      </CardContent>
    </Card>
  )
}
