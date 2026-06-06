import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ExpedienteDescargarPanel } from '@/components/app/expedientes/expediente-descargar-panel'
import { getSessionUserId } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export default async function ExpedienteDescargarPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params
  const userId = await getSessionUserId()
  if (!userId) notFound()

  const m = await prisma.expediente.findFirst({
    where: { id, accountOwnerId: userId },
    select: { id: true, nomenclaturaCatastral: true },
  })
  if (!m) notFound()

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <header className="flex shrink-0 items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-[var(--color-muted)]">Expediente · Descargas</p>
          <h1 className="font-mono text-2xl font-semibold tracking-tight text-[var(--color-heading)] sm:text-3xl">
            {m.nomenclaturaCatastral}
          </h1>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={`/expedientes/${id}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-heading)]/60 transition-colors hover:border-[var(--color-heading)]/40 hover:bg-[var(--color-muted)]/10 hover:text-[var(--color-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Volver al expediente</TooltipContent>
        </Tooltip>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--background)]/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-[var(--app-panel-ring)] sm:p-6">
        <ExpedienteDescargarPanel
          expedienteId={m.id}
          nomenclaturaCatastral={m.nomenclaturaCatastral}
        />
      </div>
    </div>
  )
}
