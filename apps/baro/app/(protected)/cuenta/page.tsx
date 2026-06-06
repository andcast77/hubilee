import { AccountAccessCard } from '@/components/app/account-access-card'
import { CuentaLegacyHashRedirect } from '@/components/app/cuenta-legacy-hash-redirect'
import { CuentaLogoutButton } from '@/components/app/cuenta-logout-button'

export default function CuentaPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <CuentaLegacyHashRedirect />
      <header className="flex shrink-0 items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-heading)] sm:text-3xl">
          Ajustes
        </h1>
        <CuentaLogoutButton />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--background)]/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-[var(--app-panel-ring)] sm:p-6">
        <AccountAccessCard />
      </div>
    </div>
  )
}
