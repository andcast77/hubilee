import { describe, expect, it } from 'vitest'
import {
  expedienteDatosGeneralesSchema,
  expedienteNuevaSchema,
  parseExpedienteDatosGeneralesFormData,
  parseExpedienteNuevaFormData,
} from '@/lib/expediente/schemas'

/** Id de ejemplo (mismo formato que cuid de Prisma en runtime). */
const TITULAR_ID_FIXTURE = 'cmdevtitularprofessionalseed01'

const minimalBase = {
  actuantesIds: [TITULAR_ID_FIXTURE],
  objetoExpedienteId: 'cabida_unica',
  nomenclaturaCatastral: '18-88/418288',
  nomenclaturaAnulada: false,
  planoAntecedente: '',
  loteFraccion: '',
  domicilioParcela: '',
  parcial: false,
  soloOrdenTrabajo: false,
  propietario: 'ACME S.A.',
  domicilioPropietario: '',
  inscripcionDominio: '',
  naturalezaActo: '',
  memoriaObservaciones: '',
  motivoHidraulica: '',
  motivoFiscalia: '',
  municipio: '',
  requiereVisacionMunicipal: false,
}

describe('expedienteNuevaSchema', () => {
  it('acepta un borrador válido mínimo', () => {
    const r = expedienteNuevaSchema.safeParse(minimalBase)
    expect(r.success).toBe(true)
  })

  it('normaliza nomenclatura catastral (espacios y separadores)', () => {
    const r = expedienteNuevaSchema.safeParse({
      ...minimalBase,
      nomenclaturaCatastral: '  18 - 88 / 418288  ',
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.nomenclaturaCatastral).toBe('18-88/418288')
  })

  it('rechaza objeto de expediente desconocido', () => {
    const r = expedienteNuevaSchema.safeParse({
      ...minimalBase,
      objetoExpedienteId: 'no_existe',
      nomenclaturaCatastral: 'x',
    })
    expect(r.success).toBe(false)
  })

  it('parseExpedienteNuevaFormData lee radios y checkboxes', () => {
    const fd = new FormData()
    fd.append('actuantesIds', 'A')
    fd.append('actuantesIds', 'B')
    fd.set('objetoExpedienteId', 'judicial')
    fd.set('nomenclaturaCatastral', 'n')
    fd.set('propietario', 'p')
    fd.set('parcial', 'on')
    fd.set('requiereVisacionMunicipal', 'on')
    const raw = parseExpedienteNuevaFormData(fd)
    expect(raw.actuantesIds).toEqual(['A', 'B'])
    expect(raw.parcial).toBe(true)
    expect(raw.requiereVisacionMunicipal).toBe(true)
  })
})

describe('expedienteDatosGeneralesSchema', () => {
  it('acepta datos válidos con nomenclaturaAnulada en false', () => {
    const r = expedienteDatosGeneralesSchema.safeParse({ ...minimalBase, nomenclaturaAnulada: false })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.nomenclaturaAnulada).toBe(false)
    }
  })

  it('acepta nomenclaturaAnulada true', () => {
    const r = expedienteDatosGeneralesSchema.safeParse({ ...minimalBase, nomenclaturaAnulada: true })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.nomenclaturaAnulada).toBe(true)
    }
  })

  it('rechaza objeto de expediente desconocido', () => {
    const r = expedienteDatosGeneralesSchema.safeParse({
      ...minimalBase,
      objetoExpedienteId: 'no_existe',
      nomenclaturaAnulada: false,
    })
    expect(r.success).toBe(false)
  })

  it('acepta fechaOrdenTrabajo string y lo pasa al output', () => {
    const r = expedienteDatosGeneralesSchema.safeParse({
      ...minimalBase,
      nomenclaturaAnulada: false,
      fechaOrdenTrabajo: '2024-06-01',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.fechaOrdenTrabajo).toBe('2024-06-01')
    }
  })

  it('fechaOrdenTrabajo defaults to empty string when omitted', () => {
    const r = expedienteDatosGeneralesSchema.safeParse({ ...minimalBase, nomenclaturaAnulada: false })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.fechaOrdenTrabajo).toBe('')
    }
  })

  it('parseExpedienteDatosGeneralesFormData incluye nomenclaturaAnulada desde checkbox', () => {
    const fd = new FormData()
    fd.append('actuantesIds', TITULAR_ID_FIXTURE)
    fd.set('objetoExpedienteId', 'cabida_unica')
    fd.set('nomenclaturaCatastral', 'n')
    fd.set('propietario', 'p')
    fd.set('nomenclaturaAnulada', 'on')
    const raw = parseExpedienteDatosGeneralesFormData(fd)
    expect(raw.nomenclaturaAnulada).toBe(true)
  })
})
