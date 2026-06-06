import { describe, expect, it } from 'vitest'
import { EXPEDIENTE_DOWNLOAD_DOC_TYPES } from '@/lib/expediente/descarga'
import {
  EXPEDIENTE_DOCX_DOCUMENT_IDS,
  type ExpedienteDocxCanonicalData,
  type ExpedienteDocxRenderResult,
} from '@/lib/expediente/docx/types'

describe('EXPEDIENTE_DOCX_DOCUMENT_IDS', () => {
  it('enumera exactamente los tipos del catálogo de descarga', () => {
    expect(EXPEDIENTE_DOCX_DOCUMENT_IDS).toHaveLength(8)
    expect([...EXPEDIENTE_DOCX_DOCUMENT_IDS].sort()).toEqual([...EXPEDIENTE_DOWNLOAD_DOC_TYPES].sort())
  })

  it('no contiene duplicados', () => {
    expect(new Set(EXPEDIENTE_DOCX_DOCUMENT_IDS).size).toBe(EXPEDIENTE_DOCX_DOCUMENT_IDS.length)
  })
})

describe('contratos estructurales', () => {
  it('ExpedienteDocxRenderResult incluye versión de plantilla y advertencias', () => {
    const sample: ExpedienteDocxRenderResult = {
      buffer: Buffer.from('PK\x03\x04'),
      filename: 'ActaExpediente_18-88_418288.docx',
      templateVersion: '1.0.0',
      warnings: ['BORRADOR - DATOS INCOMPLETOS'],
    }
    expect(sample.templateVersion).toBe('1.0.0')
    expect(sample.warnings).toHaveLength(1)
    expect(sample.buffer.subarray(0, 4).toString('utf8')).toBe('PK\x03\x04')
  })

  it('ExpedienteDocxCanonicalData expone las secciones del diseño', () => {
    const canonical: ExpedienteDocxCanonicalData = {
      datos: { nomenclaturaCatastral: '18-88/418288' },
      publicacion: {},
      colindantes: [],
      ordenantes: [],
      linderos: {},
      titulosLegacy: [],
      firmas: [{ nombre: 'Uno' }],
    }
    expect(canonical.datos.nomenclaturaCatastral).toBe('18-88/418288')
    expect(canonical.firmas).toHaveLength(1)
  })
})
