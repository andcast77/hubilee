/**
 * Reglas de UI del expediente sin acceso a base de datos (seguro para `"use client"` y bundles cliente).
 */

/** Subconjunto de `Prisma.TransactionClient` usado por `replaceExpedienteActuantes` (evita importar `@prisma/client` acá). */
export type ExpedienteActuantesTransaction = {
  expedienteActuante: {
    deleteMany: (args: { where: { expedienteId: string } }) => Promise<unknown>
    createMany: (args: {
      data: Array<{ expedienteId: string; professionalId: string; orden: number }>
    }) => Promise<unknown>
  }
}

/** Máximo de profesionales actuantes por expediente (UI + persistencia). */
export const EXPEDIENTE_MAX_ACTUANTES = 12

export function principalSecondFromActuantes(actuantesIds: string[]): {
  principalProfessionalId: string
  secondProfessionalId: string | null
} {
  const ids = actuantesIds.map((x) => x.trim()).filter(Boolean)
  return {
    principalProfessionalId: ids[0] ?? '',
    secondProfessionalId: ids.length >= 2 ? ids[1]! : null,
  }
}

/** Borrador sin actuantes: conserva principal/segundo ya persistidos en el expediente. */
export function principalSecondForPersist(
  actuantesOrdered: string[],
  existing: { principalProfessionalId: string; secondProfessionalId: string | null } | null
): { principalProfessionalId: string; secondProfessionalId: string | null } {
  if (actuantesOrdered.length > 0) {
    return principalSecondFromActuantes(actuantesOrdered)
  }
  if (existing) {
    return {
      principalProfessionalId: existing.principalProfessionalId,
      secondProfessionalId: existing.secondProfessionalId,
    }
  }
  return { principalProfessionalId: '', secondProfessionalId: null }
}

export async function replaceExpedienteActuantes(
  tx: ExpedienteActuantesTransaction,
  expedienteId: string,
  professionalIdsOrdered: string[]
): Promise<void> {
  await tx.expedienteActuante.deleteMany({ where: { expedienteId } })
  if (professionalIdsOrdered.length === 0) return
  await tx.expedienteActuante.createMany({
    data: professionalIdsOrdered.map((professionalId, orden) => ({
      expedienteId,
      professionalId,
      orden,
    })),
  })
}

// ─── secciones del shell ────────────────────────────────────────────────────

export const EXPEDIENTE_SECTION_IDS = ['datos', 'colindantes', 'titulo', 'publicacion'] as const

export type ExpedienteSeccion = (typeof EXPEDIENTE_SECTION_IDS)[number]

export const expedienteSectionMeta: ReadonlyArray<{
  id: ExpedienteSeccion
  label: string
  /** Etiqueta corta para la barra de pestañas en mobile. */
  shortLabel: string
}> = [
  { id: 'datos', label: 'Datos generales', shortLabel: 'Datos' },
  { id: 'publicacion', label: 'Publicación y acta', shortLabel: 'Acta' },
  { id: 'titulo', label: 'Relación de títulos', shortLabel: 'Títulos' },
  { id: 'colindantes', label: 'Colindantes', shortLabel: 'Colindantes' },
]

const SECTION_SET = new Set<string>(EXPEDIENTE_SECTION_IDS)

export function normalizeExpedienteSeccion(raw: string | null | undefined): ExpedienteSeccion {
  if (raw && SECTION_SET.has(raw)) {
    return raw as ExpedienteSeccion
  }
  return 'datos'
}

export function buildExpedienteQueryString(raw: string | null | undefined): string {
  const seccion = normalizeExpedienteSeccion(raw)
  return `seccion=${seccion}`
}

// ─── validación actuantes (solo forma; la comprobación contra BD está en ui-rules) ─

export type ExpedienteActuantesInput = { actuantesIds: string[] }
