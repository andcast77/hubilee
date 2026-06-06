import type { ReactNode } from 'react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

type AppAlertBannerProps = {
  title: string
  children?: ReactNode
}

export function AppAlertBanner({ title, children }: AppAlertBannerProps) {
  return (
    <div className="shrink-0 px-4 pt-5 sm:px-7 sm:pt-6">
      <Alert
        role="status"
        className="relative overflow-hidden rounded-2xl border border-[var(--app-alert-border)]/60 bg-gradient-to-br from-[var(--app-alert-bg)] via-[rgb(255_251_235)] to-[rgb(254_243_199)] px-4 py-4 text-[var(--app-alert-fg)] shadow-[var(--shadow-soft)] sm:px-5"
      >
        <div
          className="pointer-events-none absolute -right-4 -top-8 h-24 w-24 rounded-full bg-[var(--cta)]/10 blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
          <span
            className="inline-flex w-fit shrink-0 rounded-md bg-[var(--app-alert-fg)]/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--app-alert-fg)]"
            aria-hidden
          >
            Atención
          </span>
          <div className="min-w-0 flex-1">
            <AlertTitle className="text-sm font-semibold leading-snug">{title}</AlertTitle>
            {children ? (
              <AlertDescription className="mt-2 text-sm leading-relaxed opacity-95">
                {children}
              </AlertDescription>
            ) : null}
          </div>
        </div>
      </Alert>
    </div>
  )
}
