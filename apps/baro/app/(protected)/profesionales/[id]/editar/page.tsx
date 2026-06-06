'use client'

import { useParams, useRouter } from 'next/navigation'
import { ProfessionalProfileForm } from '@/components/app/professional-profile-form'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function EditarProfesionalPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <header className="flex shrink-0 items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-heading)] sm:text-3xl">
          Editar profesional
        </h1>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => document.querySelector('form')?.requestSubmit()}
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
                href="/profesionales"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-heading)]/60 transition-colors hover:border-[var(--color-heading)]/40 hover:bg-[var(--color-muted)]/10 hover:text-[var(--color-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>Volver al listado</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--background)]/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-[var(--app-panel-ring)] sm:p-6">
        <ProfessionalProfileForm
          variant="collaborator"
          collaboratorId={id}
          onCollaboratorSaved={() => router.push('/profesionales')}
        />
      </div>
    </div>
  )
}
