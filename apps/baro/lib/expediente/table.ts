import type { Expediente, Professional } from '@prisma/client'

export type ExpedienteRow = {
  id: string
  profesionalNombre: string
  profesionalIniciales: string
  fechaActa: string
  nomenclatura: string
  titular: string
  ubicacion: string
}

export type ExpedienteFilters = {
  q: string
  from: string
  to: string
}

export type ExpedienteListRecord = Expediente & {
  principalProfessional: Pick<Professional, 'displayName'>
}

export function displayNameInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase()
}

export function expedienteToListRow(m: ExpedienteListRecord): ExpedienteRow {
  return {
    id: m.id,
    profesionalNombre: m.principalProfessional.displayName,
    profesionalIniciales: displayNameInitials(m.principalProfessional.displayName),
    fechaActa: m.createdAt.toISOString(),
    nomenclatura: m.nomenclaturaCatastral,
    titular: m.propietario,
    ubicacion: m.domicilioParcela?.trim() ?? '',
  }
}

export function filterExpedientes(rows: ExpedienteRow[], f: ExpedienteFilters): ExpedienteRow[] {
  const q = f.q.trim().toLowerCase()
  const fromTs = f.from ? new Date(`${f.from}T00:00:00`).getTime() : null
  const toTs = f.to ? new Date(`${f.to}T23:59:59.999`).getTime() : null

  return rows.filter((row) => {
    if (q) {
      const hay =
        `${row.profesionalNombre} ${row.nomenclatura} ${row.titular} ${row.ubicacion}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    const t = new Date(row.fechaActa).getTime()
    if (fromTs !== null && t < fromTs) return false
    if (toTs !== null && t > toTs) return false
    return true
  })
}

export function formatFechaActa(iso: string, locale = 'es-AR') {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}
