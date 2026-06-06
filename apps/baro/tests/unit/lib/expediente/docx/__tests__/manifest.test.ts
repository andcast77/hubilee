import { describe, expect, it } from 'vitest'
import { ExpedienteDocxError } from '@/lib/expediente/docx/errors'
import {
  assertBufferMatchesChecksum,
  loadTemplateGovernanceManifest,
  parseTemplateGovernanceManifestJson,
  sha256Hex,
} from '@/lib/expediente/docx/manifest'

describe('parseTemplateGovernanceManifestJson', () => {
  it('acepta manifiesto válido', () => {
    const m = parseTemplateGovernanceManifestJson({
      templateKey: 'acta',
      activeVersion: '1.0.0',
      schemaVersion: 1,
      releasedAt: '2026-04-27T00:00:00.000Z',
      rollbackTo: null,
      templateFileRelativeToContext: 'ActaExpediente_99-99_999999 (parcial).docx',
    })
    expect(m.activeVersion).toBe('1.0.0')
    expect(m.templateFileRelativeToContext).toContain('ActaExpediente')
  })

  it('rechaza rutas con traversal', () => {
    expect(() =>
      parseTemplateGovernanceManifestJson({
        templateKey: 'acta',
        activeVersion: '1.0.0',
        schemaVersion: 1,
        releasedAt: '2026-04-27T00:00:00.000Z',
        rollbackTo: null,
        templateFileRelativeToContext: '../secrets.docx',
      })
    ).toThrow()
  })

  it('checksum opcional valida hex de 64 chars', () => {
    const hex = 'a'.repeat(64)
    const m = parseTemplateGovernanceManifestJson({
      templateKey: 'acta',
      activeVersion: '1.0.0',
      checksumSha256: hex,
      schemaVersion: 1,
      releasedAt: '2026-04-27T00:00:00.000Z',
      rollbackTo: null,
      templateFileRelativeToContext: 'x.docx',
    })
    expect(m.checksumSha256).toBe(hex)
  })
})

describe('assertBufferMatchesChecksum', () => {
  it('coincide cuando el hash es correcto', () => {
    const buf = Buffer.from('hola')
    assertBufferMatchesChecksum(buf, sha256Hex(buf))
  })

  it('falla con ExpedienteDocxError plantilla_faltante si no coincide', () => {
    expect(() => assertBufferMatchesChecksum(Buffer.from('a'), 'b'.repeat(64))).toThrow(
      ExpedienteDocxError
    )
    try {
      assertBufferMatchesChecksum(Buffer.from('a'), 'b'.repeat(64))
    } catch (e) {
      expect((e as ExpedienteDocxError).code).toBe('plantilla_faltante')
    }
  })
})

describe('loadTemplateGovernanceManifest (disco)', () => {
  it('carga manifiesto orden-trabajo (referencia PDF de gobierno)', async () => {
    const m = await loadTemplateGovernanceManifest('orden-trabajo')
    expect(m.templateKey).toBe('orden-trabajo')
    expect(m.templateFileRelativeToContext).toBe('OrdenDeTrabajo.pdf')
  })
})
