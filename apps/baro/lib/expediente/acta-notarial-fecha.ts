/**
 * Fecha/hora de acta notarial en formularios: **dd/mm/aaaa hh:mm** (24 h).
 * En base puede persistir texto legacy ISO (`yyyy-mm-ddThh:mm`) por datos antiguos.
 */

export const ACTA_NOTARIAL_FECHA_FORMAT_HINT = 'dd/mm/aaaa hh:mm'

/** `dd/mm/aaaa hh:mm` o `dd/mm/aaaa hh:mm:ss` (segundos/milisegundos opcionales por datos legacy o export). */
const RE_DD_MM_YYYY_HH_MM_SS =
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Fecha local → cadena canónica para guardar y mostrar. */
export function formatActaNotarialFechaDdMmYyyyHhMm(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/**
 * Interpreta `dd/mm/aaaa hh:mm` o, por compatibilidad, `yyyy-mm-ddThh:mm` (datetime-local).
 * Devuelve `null` si no es válido.
 */
export function parseActaNotarialFechaToDate(raw: string): Date | null {
  const s = raw
    .trim()
    .replace(/[\u00a0\u202f\u2007]/g, ' ')
    .replace(/\s+/g, ' ')
  if (!s) return null

  const m = RE_DD_MM_YYYY_HH_MM_SS.exec(s)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2])
    const year = Number(m[3])
    const hour = Number(m[4])
    const minute = Number(m[5])
    const second = m[6] != null && m[6] !== '' ? Number(m[6]) : 0
    if (hour > 23 || minute > 59 || second > 59 || month < 1 || month > 12 || day < 1 || day > 31)
      return null
    const d = new Date(year, month - 1, day, hour, minute, second)
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
    return d
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Al cargar desde DB: normaliza a dd/mm/aaaa hh:mm si se puede interpretar. */
export function actaNotarialFechaDbToForm(raw: string | null | undefined): string {
  if (raw == null || raw === '') return ''
  const d = parseActaNotarialFechaToDate(raw)
  if (d) return formatActaNotarialFechaDdMmYyyyHhMm(d)
  return raw.trim()
}

/** Valor para `input type="datetime-local"` (`yyyy-mm-ddThh:mm`, hora 24 h). */
export function actaNotarialFechaToDatetimeLocal(raw: string): string {
  const d = parseActaNotarialFechaToDate(raw.trim())
  if (!d) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function datetimeLocalToActaNotarialFecha(v: string): string {
  const s = v.trim()
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return formatActaNotarialFechaDdMmYyyyHhMm(d)
}

/**
 * Extract date from dd/mm/aaaa hh:mm format as yyyy-MM-dd for DatePicker.
 * Also handles legacy ISO yyyy-mm-ddThh:mm for backward compatibility.
 * Returns empty string if unparseable.
 */
export function parseActaNotarialFechaDate(raw: string): string {
  if (!raw) return ''
  
  const s = raw
    .trim()
    .replace(/[\u00a0\u202f\u2007]/g, ' ')
    .replace(/\s+/g, ' ')

  // Try dd/mm/aaaa hh:mm format
  const m = RE_DD_MM_YYYY_HH_MM_SS.exec(s)
  if (m) {
    const year = Number(m[3])
    const month = pad2(Number(m[2]))
    const day = pad2(Number(m[1]))
    return `${year}-${month}-${day}`
  }

  // Try legacy ISO format yyyy-mm-ddThh:mm
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    const datePart = s.split('T')[0]
    return datePart
  }

  return ''
}

/**
 * Extract time from dd/mm/aaaa hh:mm format as HH:mm.
 * Also handles legacy ISO yyyy-mm-ddThh:mm for backward compatibility.
 * Returns empty string if unparseable.
 */
export function parseActaNotarialFechaTime(raw: string): string {
  if (!raw) return ''
  
  const s = raw
    .trim()
    .replace(/[\u00a0\u202f\u2007]/g, ' ')
    .replace(/\s+/g, ' ')

  // Try dd/mm/aaaa hh:mm format
  const m = RE_DD_MM_YYYY_HH_MM_SS.exec(s)
  if (m) {
    const hour = pad2(Number(m[4]))
    const minute = pad2(Number(m[5]))
    return `${hour}:${minute}`
  }

  // Try legacy ISO format yyyy-mm-ddThh:mm
  const isoMatch = s.match(/^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})/)
  if (isoMatch) {
    return `${isoMatch[1]}:${isoMatch[2]}`
  }

  return ''
}

/**
 * Combine yyyy-MM-dd (from DatePicker) + HH:mm into dd/mm/aaaa hh:mm.
 * If dateStr is empty, returns empty string.
 */
export function combineActaNotarialFecha(dateStr: string, timeStr: string): string {
  if (!dateStr) return ''
  
  const dateParts = dateStr.split('-')
  if (dateParts.length !== 3) return ''
  
  const year = dateParts[0]
  const month = dateParts[1]
  const day = dateParts[2]
  
  // Validate time format (HH:mm)
  if (!/^\d{2}:\d{2}$/.test(timeStr)) {
    // If time is invalid, default to 00:00
    return `${day}/${month}/${year} 00:00`
  }
  
  return `${day}/${month}/${year} ${timeStr}`
}

/**
 * Format tolerance minutes for display:
 * - 0 → ""
 * - 30 → "30 minutos"
 * - 60 → "1 hora"
 * - 90 → "1 hora 30 min"
 * - 120 → "2 horas"
 * - etc.
 */
export function toleranceMinutesToDisplay(minutes: number): string {
  if (minutes === 0) return ''
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (hours === 0) {
    return `${minutes} minutos`
  }
  
  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hora' : `${hours} horas`
  }
  
  return hours === 1 
    ? `1 hora ${remainingMinutes} min` 
    : `${hours} horas ${remainingMinutes} min`
}

/**
 * Parse tolerance string to minutes:
 * - null/undefined/'' → 30
 * - "30" → 30, "60" → 60, etc.
 * - "30 Minutos" → 30, "1 Hora" → 60, "2 Horas" → 120 (case-insensitive)
 * - Match: extract first number; if "hora" in string, multiply by 60; otherwise use number
 * - Default: 30
 */
export function parseToleranciaToMinutes(raw: string | null | undefined): number {
  if (raw == null || raw === '') return 30
  
  const s = raw.trim().toLowerCase()
  
  // Extract first number
  const numMatch = s.match(/\d+/)
  if (!numMatch) return 30
  
  const num = parseInt(numMatch[0], 10)
  
  // Check if string contains "hora" (hour)
  if (s.includes('hora')) {
    return num * 60
  }
  
  return num
}

/**
 * Clamp tolerance minutes to [30, 240] range.
 */
export function clampTolerance(minutes: number): number {
  return Math.min(Math.max(minutes, 30), 240)
}
