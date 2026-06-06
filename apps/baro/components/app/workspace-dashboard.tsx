import Link from 'next/link'
import { StatCard } from '@/components/app/stat-card'
import { IconFile, IconFolder, IconUsers } from '@/components/app/icons'

export type WorkspaceDashboardRecentExpediente = {
  id: string
  nomenclaturaCatastral: string
  propietario: string
  updatedAt: string
}

export type WorkspaceDashboardProps = {
  expedienteCount: number
  professionalCount: number
  recentExpedientes: WorkspaceDashboardRecentExpediente[]
}

function formatShortDate(iso: string, locale = 'es-AR') {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function WorkspaceDashboard({
  expedienteCount,
  professionalCount,
  recentExpedientes,
}: WorkspaceDashboardProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <header className="flex shrink-0 items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-heading)] sm:text-3xl">
          Mesa de trabajo
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--background)]/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-[var(--app-panel-ring)] sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            kicker="Expedientes"
            title="Expedientes en cuenta"
            value={expedienteCount}
            icon={<IconFile className="h-4 w-4" />}
            actionLabel="Abrir bandeja"
            actionHref="/expedientes"
          />
          <StatCard
            kicker="Próximamente"
            title="Obras / proyectos"
            value={0}
            icon={<IconFolder className="h-4 w-4" />}
          />
          <StatCard
            kicker="Estudio"
            title="Profesionales"
            value={professionalCount}
            icon={<IconUsers className="h-4 w-4" />}
            actionLabel="Gestionar"
            actionHref="/profesionales"
          />
        </div>

        <div className="mt-6 flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-[var(--color-heading)]">
              Expedientes recientes
            </h2>
            <Link
              href="/expedientes"
              className="text-xs font-medium text-[var(--accent-bright)] underline-offset-4 hover:underline"
            >
              Ver todas
            </Link>
          </div>
          <ul className="mt-3 space-y-0 rounded-xl border border-[var(--color-border)] bg-[var(--background)]/80 p-3 shadow-[var(--shadow-soft)] ring-1 ring-[var(--app-panel-ring)] sm:p-4">
            {recentExpedientes.length === 0 ? (
              <li className="px-2 py-8 text-center text-sm text-[var(--color-muted)]">
                Todavía no hay expedientes.{' '}
                <Link
                  href="/expedientes/nueva"
                  className="font-semibold text-[var(--accent-bright)] hover:underline"
                >
                  Crear la primera
                </Link>
                .
              </li>
            ) : (
              recentExpedientes.map((m, i) => (
                <li key={m.id} className="relative flex gap-3 pb-5 pl-0.5 last:pb-0">
                  {i < recentExpedientes.length - 1 ? (
                    <span
                      className="absolute bottom-0 left-[13px] top-7 w-px bg-gradient-to-b from-[var(--color-border)] to-transparent"
                      aria-hidden
                    />
                  ) : null}
                  <span className="relative z-[1] mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-bright)] ring-2 ring-[var(--background)]">
                    <IconFile className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <Link
                      href={`/expedientes/${m.id}`}
                      className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]"
                    >
                      <p className="font-mono text-[0.65rem] font-medium text-[var(--accent-bright)] group-hover:underline">
                        {m.nomenclaturaCatastral}
                      </p>
                      <p className="mt-0.5 text-sm font-medium leading-snug text-[var(--color-heading)] group-hover:text-[var(--accent-bright)]">
                        {m.propietario}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        Actualizado {formatShortDate(m.updatedAt)}
                      </p>
                    </Link>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
