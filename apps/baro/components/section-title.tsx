import type { ReactNode } from 'react'

type SectionTitleProps = {
  children: ReactNode
}

export function SectionTitle({ children }: SectionTitleProps) {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-bright)] sm:text-3xl">
        {children}
      </h2>
      <div
        className="mx-auto mt-4 h-0.5 w-14 rounded-full bg-[var(--color-accent-bright)]"
        aria-hidden
      />
    </div>
  )
}
