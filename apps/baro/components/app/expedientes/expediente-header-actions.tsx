'use client'

import Link from 'next/link'
import { ArrowLeft, Download, Save } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function ExpedienteHeaderActions({ expedienteId }: { expedienteId: string }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="submit"
            form="expediente-full-form"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-heading)]/60 transition-colors hover:border-[var(--color-heading)]/40 hover:bg-[var(--color-muted)]/10 hover:text-[var(--color-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]"
          >
            <Save className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Guardar</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={`/expedientes/${expedienteId}/descargar`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--accent-bright)]/40 text-[var(--accent-bright)] transition-colors hover:border-[var(--accent-bright)] hover:bg-[var(--accent-bright)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]"
          >
            <Download className="h-4 w-4" />
          </Link>
        </TooltipTrigger>
        <TooltipContent>Descargar archivos</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/expedientes"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-heading)]/60 transition-colors hover:border-[var(--color-heading)]/40 hover:bg-[var(--color-muted)]/10 hover:text-[var(--color-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </TooltipTrigger>
        <TooltipContent>Volver a expedientes</TooltipContent>
      </Tooltip>
    </div>
  )
}
