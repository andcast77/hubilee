import type { NextRequest } from 'next/server'

/** Contexto opcional para handlers de descarga DOCX dinámica. */
export type DynamicDocxRenderContext = {
  request?: NextRequest
}
