import { describe, expect, it, vi, beforeEach } from 'vitest'
import { updateExpedienteDatosGenerales } from '@/lib/expediente/actions/datos-generales'

const TITULAR_ID_FIXTURE = 'cmdevtitularprofessionalseed01'

const getSessionUserId = vi.fn()
const findManyProfessionals = vi.fn()
const findFirstExpediente = vi.fn()
const txExpedienteUpdate = vi.fn()
const deleteManyActuante = vi.fn()
const createManyActuante = vi.fn()

const txMock = {
  expediente: { update: (...a: unknown[]) => txExpedienteUpdate(...a) },
  expedienteActuante: {
    deleteMany: (...a: unknown[]) => deleteManyActuante(...a),
    createMany: (...a: unknown[]) => createManyActuante(...a),
  },
}

vi.mock('@/lib/auth/session', () => ({
  getSessionUserId: () => getSessionUserId(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    professional: { findMany: (...a: unknown[]) => findManyProfessionals(...a) },
    expediente: {
      findFirst: (...a: unknown[]) => findFirstExpediente(...a),
    },
    $transaction: (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock),
  },
}))

function buildValidFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.set('expedienteId', 'm1')
  fd.append('actuantesIds', TITULAR_ID_FIXTURE)
  fd.set('objetoExpedienteId', 'cabida_unica')
  fd.set('nomenclaturaCatastral', '18-88/418288')
  fd.set('planoAntecedente', '')
  fd.set('loteFraccion', '')
  fd.set('domicilioParcela', '')
  fd.set('propietario', 'ACME')
  fd.set('domicilioPropietario', '')
  fd.set('inscripcionDominio', '')
  fd.set('naturalezaActo', '')
  fd.set('memoriaObservaciones', '')
  fd.set('motivoHidraulica', '')
  fd.set('motivoFiscalia', '')
  fd.set('municipio', '')
  fd.set('fechaOrdenTrabajo', '')
  for (const [k, v] of Object.entries(overrides)) {
    fd.set(k, v)
  }
  return fd
}

describe('updateExpedienteDatosGenerales', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionUserId.mockResolvedValue('user-1')
    findManyProfessionals.mockResolvedValue([{ id: TITULAR_ID_FIXTURE }])
    findFirstExpediente.mockResolvedValue({ id: 'm1', accountOwnerId: 'user-1' })
    txExpedienteUpdate.mockResolvedValue({})
    deleteManyActuante.mockResolvedValue({ count: 0 })
    createManyActuante.mockResolvedValue({ count: 1 })
  })

  it('actualiza el expediente cuando el usuario es dueño y los datos son válidos', async () => {
    const fd = buildValidFormData()
    const r = await updateExpedienteDatosGenerales(undefined, fd)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.message).toMatch(/guard/i)
    }
    expect(txExpedienteUpdate).toHaveBeenCalledTimes(1)
    expect(deleteManyActuante).toHaveBeenCalledTimes(1)
    expect(createManyActuante).toHaveBeenCalledTimes(1)
    const call = txExpedienteUpdate.mock.calls[0]![0] as {
      where: { id: string }
      data: { nomenclaturaCatastral: string; nomenclaturaAnulada: boolean }
    }
    expect(call.where).toEqual({ id: 'm1' })
    expect(call.data.nomenclaturaCatastral).toBe('18-88/418288')
    expect(call.data.nomenclaturaAnulada).toBe(false)
  })

  it('no persiste y devuelve errores de validación si el objeto es inválido', async () => {
    const fd = buildValidFormData({ objetoExpedienteId: 'no_existe' })
    const r = await updateExpedienteDatosGenerales(undefined, fd)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.fieldErrors?.objetoExpedienteId?.length).toBeGreaterThan(0)
    }
    expect(txExpedienteUpdate).not.toHaveBeenCalled()
  })

  it('no actualiza si el expediente no pertenece al usuario', async () => {
    findFirstExpediente.mockResolvedValue(null)
    const fd = buildValidFormData()
    const r = await updateExpedienteDatosGenerales(undefined, fd)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.message).toMatch(/no se encontr/i)
    }
    expect(txExpedienteUpdate).not.toHaveBeenCalled()
  })
})
