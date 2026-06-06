import { describe, expect, it } from 'vitest'
import { expedienteDownloadDocCatalog } from '@/lib/expediente/descarga'
import { ExpedienteDocxError } from '@/lib/expediente/docx/errors'
import {
  getExpedienteDocxDocumentDefinition,
  listExpedienteDocxDocumentDefinitions,
  parseExpedienteDocxDocumentDefinition,
  requireExpedienteDocxDocumentDefinition,
} from '@/lib/expediente/docx/definitions'

describe('registry documental', () => {
  it('expone 8 definiciones y lookup por id estable', () => {
    const all = listExpedienteDocxDocumentDefinitions()
    expect(all).toHaveLength(8)
    const acta = getExpedienteDocxDocumentDefinition('acta')
    expect(acta.templateKey).toBe('acta')
    expect(acta.requiredFields.some((f) => f.path === 'datos.nomenclaturaCatastral')).toBe(true)
  })

  it('parse devuelve null fuera de catálogo', () => {
    expect(parseExpedienteDocxDocumentDefinition('inventado')).toBeNull()
  })

  it('require lanza documento_no_soportado fuera de catálogo', () => {
    expect(() => requireExpedienteDocxDocumentDefinition('../traversal')).toThrow(ExpedienteDocxError)
    try {
      requireExpedienteDocxDocumentDefinition('nope')
    } catch (e) {
      expect(e).toBeInstanceOf(ExpedienteDocxError)
      expect((e as ExpedienteDocxError).code).toBe('documento_no_soportado')
    }
  })

  it('alinea nombres de plantilla estática con el catálogo de descarga', () => {
    const byId = Object.fromEntries(listExpedienteDocxDocumentDefinitions().map((d) => [d.id, d]))
    for (const row of expedienteDownloadDocCatalog) {
      expect(byId[row.id].staticTemplateFileName ?? '').toBe(row.templateFileName)
      expect(byId[row.id].attachmentBasePrefix).toBe(row.attachmentBasePrefix)
    }
  })

  it('orden-trabajo es documento dinámico sin plantilla estática', () => {
    const ot = getExpedienteDocxDocumentDefinition('orden-trabajo')
    expect(ot.dynamic).toBe(true)
    expect(ot.staticTemplateFileName).toBeUndefined()
  })

  it('edicto marca publicación como crítica (R6)', () => {
    const edicto = getExpedienteDocxDocumentDefinition('edicto')
    const paths = edicto.requiredFields.filter((f) => f.criticality === 'critical').map((f) => f.path)
    expect(paths).toEqual(
      expect.arrayContaining([
        'datos.nomenclaturaCatastral',
        'datos.medioPublicacion',
        'datos.publicacionEdictoFecha',
      ])
    )
  })
})
