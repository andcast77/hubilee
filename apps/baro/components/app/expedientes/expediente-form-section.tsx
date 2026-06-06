import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ExpedienteFormSection({
  icon: Icon,
  title,
  description,
  featured,
  children,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  featured?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--background)] shadow-[var(--shadow-soft)] ring-1 ring-[var(--app-panel-ring)]',
        className
      )}
    >
      {featured ? (
        <div
          className="z-0 opacity-50 pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-r from-[var(--accent-bright)] via-[var(--cta)] to-[var(--accent-bright)]"
          aria-hidden
        />
      ) : null}
      <div
        className={cn(
          'p-4 z-10 relative rounded-2xl bg-[var(--background)] ml-1 overflow-hidden',
          featured && 'pt-5'
        )}
      >
        <div className="mb-5 flex gap-2">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--accent-bright)]/20 bg-[var(--color-accent-soft)]/35 text-[var(--accent-bright)] shadow-[var(--shadow-soft)] sm:h-11 sm:w-11"
            aria-hidden
          >
            <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-base font-semibold tracking-tight text-[var(--color-heading)] text-md m-0">
              {title}
            </h2>
            {description ? (
              <p className="text-xs leading-relaxed text-[var(--color-muted)]">{description}</p>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </section>
  )
}

export function FormSubsectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-heading)]/85">
      {children}
    </p>
  )
}
