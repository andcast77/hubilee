'use client'

import { useState } from 'react'
import { Download, Eye } from 'lucide-react'

import { ExpedienteDocxPreviewDialog } from '@/components/app/expedientes/expediente-docx-preview-dialog'
import type { ExpedienteDownloadDocType } from '@/lib/expediente/descarga-catalog'
import { expedienteDownloadDocCatalog } from '@/lib/expediente/descarga-catalog'

export function ExpedienteDescargarPanel({
  expedienteId,
}: {
  expedienteId: string
  nomenclaturaCatastral: string
}) {
  const [preview, setPreview] = useState<{
    id: ExpedienteDownloadDocType
    label: string
  } | null>(null)

  return (
    <div className="space-y-4">
      <ul
        className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--background)]/50 shadow-[var(--shadow-soft)]"
        aria-label="Documentos disponibles para descargar"
      >
        {expedienteDownloadDocCatalog.map((doc) => (
          <li
            key={doc.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
          >
            <span className="text-[var(--color-heading)] text-sm font-medium">{doc.label}</span>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setPreview({ id: doc.id, label: doc.label })}
                aria-label={`Vista previa: ${doc.label}`}
                className="border-[var(--color-border)] text-[var(--accent-bright)] hover:border-[var(--accent-bright)]/60 hover:bg-[var(--accent-bright)]/8 focus-visible:ring-[var(--accent-bright)]/35 inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <Eye className="h-4 w-4" />
              </button>
              <a
                href={`/expedientes/${expedienteId}/descargar/${doc.id}?format=docx`}
                aria-label={`Descargar: ${doc.label}`}
                className="border-[var(--color-border)] text-[var(--accent-bright)] hover:border-[var(--accent-bright)]/60 hover:bg-[var(--accent-bright)]/8 focus-visible:ring-[var(--accent-bright)]/35 inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          </li>
        ))}
      </ul>

      <ExpedienteDocxPreviewDialog
        expedienteId={expedienteId}
        docId={preview?.id ?? null}
        docLabel={preview?.label ?? ''}
        open={preview !== null}
        onOpenChange={(next) => {
          if (!next) setPreview(null)
        }}
      />
    </div>
  )
}
