'use client'

import { useMemo, useState } from 'react'
import {
  GestionExpedientes,
  GestionExpedientesFilters,
} from '@/components/app/expedientes/gestion-expedientes'
import {
  filterExpedientes,
  type ExpedienteFilters,
  type ExpedienteRow,
} from '@/lib/expediente/table'

const emptyFilters: ExpedienteFilters = { q: '', from: '', to: '' }

export default function ExpedientesPageClient({ initialRows }: { initialRows: ExpedienteRow[] }) {
  const [draft, setDraft] = useState<ExpedienteFilters>(emptyFilters)
  const [applied, setApplied] = useState<ExpedienteFilters>(emptyFilters)

  const rows = useMemo(() => filterExpedientes(initialRows, applied), [initialRows, applied])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <header className="flex shrink-0 items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-heading)] sm:text-3xl">
          Gestión de Expedientes
        </h1>
      </header>

      <div className="shrink-0">
        <GestionExpedientesFilters
          draft={draft}
          onDraftChange={setDraft}
          onFiltrar={() => setApplied({ ...draft })}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--background)]/90 shadow-[var(--shadow-soft)] ring-1 ring-[var(--app-panel-ring)]">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <GestionExpedientes rows={rows} />
          </div>
        </div>
      </div>
    </div>
  )
}
