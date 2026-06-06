import type { ExpedienteDocxRenderErrorCode } from '@/lib/expediente/docx/types'

export class ExpedienteDocxError extends Error {
  readonly code: ExpedienteDocxRenderErrorCode
  readonly details?: unknown

  constructor(code: ExpedienteDocxRenderErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'ExpedienteDocxError'
    this.code = code
    this.details = details
  }
}

export function mapExpedienteDocxErrorToHttp(err: unknown): {
  status: number
  body: null | string
} {
  if (err instanceof ExpedienteDocxError) {
    switch (err.code) {
      case 'acceso_no_autorizado':
      case 'documento_no_soportado':
        return { status: 404, body: null }
      case 'plantilla_faltante':
        return { status: 503, body: err.message }
      case 'datos_faltantes':
        return { status: 422, body: err.message }
      default:
        return { status: 500, body: null }
    }
  }
  return { status: 500, body: null }
}
