import { Download } from 'lucide-react'
import { expedienteDownloadDocCatalog } from '@/lib/expediente/descarga-catalog'

export default function FormulariosPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <header className="space-y-1">
        <p className="text-sm text-[var(--color-muted)]">Formularios</p>
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--color-heading)] sm:text-3xl">
          Formularios sin datos
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--background)]/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-[var(--app-panel-ring)] sm:p-6">
        <ul
          className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--background)]/50 shadow-[var(--shadow-soft)]"
          aria-label="Formularios disponibles para descargar"
        >
          {expedienteDownloadDocCatalog.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
            >
              <span className="text-sm font-medium text-[var(--color-heading)]">{doc.label}</span>
              <a
                href={`/formularios/${doc.id}?format=docx`}
                aria-label={`Descargar formulario en blanco: ${doc.label}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--accent-bright)] transition-colors hover:border-[var(--accent-bright)]/60 hover:bg-[var(--accent-bright)]/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]/35"
              >
                <Download className="h-4 w-4" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
