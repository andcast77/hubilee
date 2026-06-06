import { describe, expect, it, vi, beforeEach } from 'vitest'
import { updateExpedienteFull } from '@/lib/expediente/actions/update-all'
import type { ExpedienteOrdenanteRowInput } from '@/lib/expediente/schemas'
import type { DatosFields, PublicacionFields } from '@/stores/expediente-store'

// ─── mocks ───────────────────────────────────────────────────────────────────

const PROF_ID = 'prof-principal-1'

const getSessionUserIdMock = vi.fn()
const findFirstExpediente = vi.fn()
const findUniqueExpediente = vi.fn()
const findManyProfessionals = vi.fn()
const txExpedienteUpdate = vi.fn()
const updateColindante = vi.fn()
const createColindante = vi.fn()
const deleteManyColindante = vi.fn()
const updateTitulo = vi.fn()
const createTitulo = vi.fn()
const deleteManyTitulo = vi.fn()
const updateOrdenante = vi.fn()
const createOrdenante = vi.fn()
const deleteManyOrdenante = vi.fn()
const upsertLinderos = vi.fn()
const updatePunto = vi.fn()
const createPunto = vi.fn()
const deleteManyPunto = vi.fn()

const deleteManyActuante = vi.fn()
const createManyActuante = vi.fn()

const txMock = {
  expediente: { update: (...a: unknown[]) => txExpedienteUpdate(...a) },
  expedienteActuante: {
    deleteMany: (...a: unknown[]) => deleteManyActuante(...a),
    createMany: (...a: unknown[]) => createManyActuante(...a),
  },
  expedienteColindante: {
    update: (...a: unknown[]) => updateColindante(...a),
    create: (...a: unknown[]) => createColindante(...a),
    deleteMany: (...a: unknown[]) => deleteManyColindante(...a),
  },
  expedienteTituloRelacion: {
    update: (...a: unknown[]) => updateTitulo(...a),
    create: (...a: unknown[]) => createTitulo(...a),
    deleteMany: (...a: unknown[]) => deleteManyTitulo(...a),
  },
  expedienteOrdenante: {
    update: (...a: unknown[]) => updateOrdenante(...a),
    create: (...a: unknown[]) => createOrdenante(...a),
    deleteMany: (...a: unknown[]) => deleteManyOrdenante(...a),
  },
  expedienteLinderos: {
    upsert: (...a: unknown[]) => upsertLinderos(...a),
  },
  expedienteLinderoPunto: {
    update: (...a: unknown[]) => updatePunto(...a),
    create: (...a: unknown[]) => createPunto(...a),
    deleteMany: (...a: unknown[]) => deleteManyPunto(...a),
  },
}

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({
  getSessionUserId: () => getSessionUserIdMock(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    professional: { findMany: (...a: unknown[]) => findManyProfessionals(...a) },
    expediente: {
      findFirst: (...a: unknown[]) => findFirstExpediente(...a),
      findUnique: (...a: unknown[]) => findUniqueExpediente(...a),
    },
    $transaction: (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock),
  },
}))

// ─── fixtures ─────────────────────────────────────────────────────────────────

const validDatos: DatosFields = {
  actuantesIds: [PROF_ID],
  objetoExpedienteId: 'cabida_unica',
  nomenclaturaCatastral: '18-88/001',
  nomenclaturaAnulada: false,
  planoAntecedente: '',
  loteFraccion: '',
  domicilioParcela: '',
  parcial: false,
  soloOrdenTrabajo: false,
  fechaOrdenTrabajo: '',
  propietario: 'Propietario Fixture',
  domicilioPropietario: '',
  inscripcionDominio: '',
  naturalezaActo: '',
  memoriaObservaciones: '',
  motivoHidraulica: '',
  motivoFiscalia: '',
  municipio: '',
  requiereVisacionMunicipal: false,
}

const validPublicacion: PublicacionFields = {
  publicacionEdictoFecha: '',
  publicacionEdictoNumero: '',
  boletinOficialNota: '',
  actaNotarialNumero: '',
  actaNotarialFecha: '',
  publicacionActaObservaciones: '',
  lugarReunion: 'Sala B',
  toleranciaActa: '30 Minutos',
  llevPublicacionEdictos: false,
  medioPublicacion: '',
}

type PuntoInput = { id?: string | null; tipo: 'CARDINAL' | 'ESPECIAL'; direccion: string; descripcion: string; medida: string }
type LinderosInput = {
  id?: string | null
  superficieTotal: string
  superficieSegun: string
  fechaRelacionTitulos: string
  observacionesGenerales: string
  puntos: PuntoInput[]
}

const emptyLinderos: LinderosInput = {
  id: null,
  superficieTotal: '',
  superficieSegun: '',
  fechaRelacionTitulos: '',
  observacionesGenerales: '',
  puntos: [],
}

function buildInput(overrides: Record<string, unknown> = {}) {
  return {
    expedienteId: 'm1',
    datos: validDatos,
    publicacion: validPublicacion,
    colindantes: [],
    titulos: [],
    ordenantes: [] as ExpedienteOrdenanteRowInput[],
    linderos: emptyLinderos,
    ...overrides,
  }
}

// ─── setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  getSessionUserIdMock.mockResolvedValue('user-1')
  findManyProfessionals.mockResolvedValue([{ id: PROF_ID }])
  findFirstExpediente.mockResolvedValue({ id: 'm1', accountOwnerId: 'user-1' })
  findUniqueExpediente.mockResolvedValue({
    colindantes: [],
    tituloRelaciones: [],
    ordenantes: [],
    linderos: null,
  })
  txExpedienteUpdate.mockResolvedValue({})
  deleteManyActuante.mockResolvedValue({ count: 0 })
  createManyActuante.mockResolvedValue({ count: 1 })
  deleteManyColindante.mockResolvedValue({})
  deleteManyTitulo.mockResolvedValue({})
  deleteManyOrdenante.mockResolvedValue({})
  upsertLinderos.mockResolvedValue({ id: 'linderos-1' })
  deleteManyPunto.mockResolvedValue({})
})

// ─── tests ────────────────────────────────────────────────────────────────────

describe('updateExpedienteFull — autenticación y autorización', () => {
  // SPEC-077: Unauthenticated call returns error
  it('SPEC-077: devuelve error cuando el usuario no está autenticado', async () => {
    getSessionUserIdMock.mockResolvedValue(null)
    const r = await updateExpedienteFull(buildInput())
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/autenticad/i)
    expect(txExpedienteUpdate).not.toHaveBeenCalled()
  })

  // SPEC-078: Ownership mismatch returns error
  it('SPEC-078: devuelve error cuando el expediente no pertenece al usuario', async () => {
    findFirstExpediente.mockResolvedValue(null)
    const r = await updateExpedienteFull(buildInput())
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/no se encontr/i)
    expect(txExpedienteUpdate).not.toHaveBeenCalled()
  })
})

describe('updateExpedienteFull — validación Zod', () => {
  // SPEC-079: Zod failure in datos returns fieldErrors
  it('SPEC-079: datos inválidos devuelven fieldErrors sin persistir', async () => {
    const r = await updateExpedienteFull(
      buildInput({ datos: { ...validDatos, objetoExpedienteId: 'no_existe' } })
    )
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.fieldErrors).toBeDefined()
      expect(r.fieldErrors!.objetoExpedienteId?.length).toBeGreaterThan(0)
    }
    expect(txExpedienteUpdate).not.toHaveBeenCalled()
  })
})

describe('updateExpedienteFull — campos escalares expediente', () => {
  // SPEC-080: Happy path persists nuevos escalares (fechaOrdenTrabajo + pub 4 fields)
  it('SPEC-080: persiste fechaOrdenTrabajo, lugarReunion, toleranciaActa, llevPublicacionEdictos, medioPublicacion', async () => {
    const r = await updateExpedienteFull(
      buildInput({
        datos: { ...validDatos, soloOrdenTrabajo: true, fechaOrdenTrabajo: '2024-06-01' },
        publicacion: {
          ...validPublicacion,
          lugarReunion: 'Sala B',
          toleranciaActa: '30 Minutos',
          llevPublicacionEdictos: true,
          medioPublicacion: 'Diario de Cuyo',
        },
      })
    )
    expect(r.ok).toBe(true)
    const updateCall = txExpedienteUpdate.mock.calls[0]![0] as { data: Record<string, unknown> }
    expect(updateCall.data.fechaOrdenTrabajo).toBe('2024-06-01')
    expect(updateCall.data.soloOrdenTrabajo).toBe(true)
    expect(updateCall.data.lugarReunion).toBe('Sala B')
    expect(updateCall.data.toleranciaActa).toBe('30 Minutos')
    expect(updateCall.data.llevPublicacionEdictos).toBe(true)
    expect(updateCall.data.medioPublicacion).toBe('Diario de Cuyo')
  })

  it('SPEC-080b: sin fecha de OT persiste soloOrdenTrabajo false aunque el cliente envíe true', async () => {
    const r = await updateExpedienteFull(
      buildInput({
        datos: { ...validDatos, soloOrdenTrabajo: true, fechaOrdenTrabajo: '' },
      })
    )
    expect(r.ok).toBe(true)
    const updateCall = txExpedienteUpdate.mock.calls[0]![0] as { data: Record<string, unknown> }
    expect(updateCall.data.soloOrdenTrabajo).toBe(false)
    expect(updateCall.data.fechaOrdenTrabajo).toBeNull()
  })

  // SPEC-081: llevPublicacionEdictos: false is NOT skipped
  it('SPEC-081: llevPublicacionEdictos false se persiste (no se omite)', async () => {
    const r = await updateExpedienteFull(
      buildInput({ publicacion: { ...validPublicacion, llevPublicacionEdictos: false } })
    )
    expect(r.ok).toBe(true)
    const updateCall = txExpedienteUpdate.mock.calls[0]![0] as { data: Record<string, unknown> }
    expect(updateCall.data).toHaveProperty('llevPublicacionEdictos', false)
  })
})

describe('updateExpedienteFull — ExpedienteOrdenante CRUD', () => {
  // SPEC-082: Creates new ordenante with correct orden
  it('SPEC-082: crea ordenante nuevo con orden = 0 cuando no hay id', async () => {
    const r = await updateExpedienteFull(
      buildInput({
        ordenantes: [
          {
            id: null,
            nombre: 'Juan Pérez',
            documento: '30123456',
            sexo: 'Masculino',
            cuit: '20-30123456-9',
            domicilio: 'San Juan',
            caracter: 'Comprador',
          },
        ],
      })
    )
    expect(r.ok).toBe(true)
    expect(createOrdenante).toHaveBeenCalledTimes(1)
    const call = createOrdenante.mock.calls[0]![0] as { data: Record<string, unknown> }
    expect(call.data.nombre).toBe('Juan Pérez')
    expect(call.data.orden).toBe(0)
  })

  // SPEC-083: Updates existing ordenante by id
  it('SPEC-083: actualiza ordenante existente por id', async () => {
    findUniqueExpediente.mockResolvedValue({
      colindantes: [],
      tituloRelaciones: [],
      ordenantes: [{ id: 'ord-1' }],
      linderos: null,
    })
    const r = await updateExpedienteFull(
      buildInput({
        ordenantes: [
          {
            id: 'ord-1',
            nombre: 'María García',
            documento: '27123456',
            sexo: 'Femenino',
            cuit: '27-27123456-4',
            domicilio: 'Rawson',
            caracter: 'Vendedor',
          },
        ],
      })
    )
    expect(r.ok).toBe(true)
    expect(updateOrdenante).toHaveBeenCalledTimes(1)
    const call = updateOrdenante.mock.calls[0]![0] as { where: { id: string }; data: Record<string, unknown> }
    expect(call.where.id).toBe('ord-1')
    expect(call.data.nombre).toBe('María García')
  })

  // SPEC-084: Deletes removed ordenantes
  it('SPEC-084: elimina ordenantes que ya no están en el payload', async () => {
    findUniqueExpediente.mockResolvedValue({
      colindantes: [],
      tituloRelaciones: [],
      ordenantes: [{ id: 'ord-old-1' }, { id: 'ord-old-2' }],
      linderos: null,
    })
    const r = await updateExpedienteFull(buildInput({ ordenantes: [] }))
    expect(r.ok).toBe(true)
    expect(deleteManyOrdenante).toHaveBeenCalledWith({
      where: { id: { in: expect.arrayContaining(['ord-old-1', 'ord-old-2']) } },
    })
  })
})

describe('updateExpedienteFull — ExpedienteLinderos upsert', () => {
  // SPEC-085: Upserts ExpedienteLinderos on create (no existing linderos)
  it('SPEC-085: hace upsert de ExpedienteLinderos cuando no existe registro previo', async () => {
    const r = await updateExpedienteFull(
      buildInput({
        linderos: { ...emptyLinderos, superficieTotal: '1500', superficieSegun: 'Replanteo' },
      })
    )
    expect(r.ok).toBe(true)
    expect(upsertLinderos).toHaveBeenCalledTimes(1)
    const call = upsertLinderos.mock.calls[0]![0] as {
      create: Record<string, unknown>
      update: Record<string, unknown>
    }
    expect(call.create.superficieTotal).toBe('1500')
    expect(call.update.superficieSegun).toBe('Replanteo')
  })

  // SPEC-086: Upserts ExpedienteLinderos on update (existing linderos)
  it('SPEC-086: hace upsert de ExpedienteLinderos cuando ya existe registro', async () => {
    findUniqueExpediente.mockResolvedValue({
      colindantes: [],
      tituloRelaciones: [],
      ordenantes: [],
      linderos: { id: 'linderos-1', puntos: [] },
    })
    const r = await updateExpedienteFull(
      buildInput({ linderos: { ...emptyLinderos, id: 'linderos-1', observacionesGenerales: 'Obs' } })
    )
    expect(r.ok).toBe(true)
    expect(upsertLinderos).toHaveBeenCalledTimes(1)
    const call = upsertLinderos.mock.calls[0]![0] as { update: Record<string, unknown> }
    expect(call.update.observacionesGenerales).toBe('Obs')
  })

  // SPEC-087: Creates new CARDINAL punto
  it('SPEC-087: crea nuevo punto CARDINAL con orden correcto', async () => {
    upsertLinderos.mockResolvedValue({ id: 'linderos-2' })
    const r = await updateExpedienteFull(
      buildInput({
        linderos: {
          ...emptyLinderos,
          puntos: [{ id: null, tipo: 'CARDINAL', direccion: 'Norte', descripcion: 'Calle Rivadavia', medida: '25.00' }],
        },
      })
    )
    expect(r.ok).toBe(true)
    expect(createPunto).toHaveBeenCalledTimes(1)
    const call = createPunto.mock.calls[0]![0] as { data: Record<string, unknown> }
    expect(call.data.tipo).toBe('CARDINAL')
    expect(call.data.direccion).toBe('Norte')
    expect(call.data.orden).toBe(0)
  })

  // SPEC-088: Deletes removed puntos
  it('SPEC-088: elimina puntos que ya no están en el payload', async () => {
    findUniqueExpediente.mockResolvedValue({
      colindantes: [],
      tituloRelaciones: [],
      ordenantes: [],
      linderos: { id: 'linderos-1', puntos: [{ id: 'punto-old-1' }] },
    })
    const r = await updateExpedienteFull(
      buildInput({ linderos: { ...emptyLinderos, id: 'linderos-1', puntos: [] } })
    )
    expect(r.ok).toBe(true)
    expect(deleteManyPunto).toHaveBeenCalledWith({
      where: { id: { in: ['punto-old-1'] } },
    })
  })
})

describe('updateExpedienteFull — colindantes notificaA / nomenclatura', () => {
  // SPEC-089: Persists notificaA and nomenclatura on colindantes
  it('SPEC-089: persiste notificaA y nomenclatura en colindante nuevo', async () => {
    const r = await updateExpedienteFull(
      buildInput({
        colindantes: [
          {
            id: null,
            rumbo: 'N',
            distancia: '10.00',
            colindante: 'ACME SA',
            descripcion: null,
            notificaA: 'Municipal',
            nomenclatura: '18-88/002',
          },
        ],
      })
    )
    expect(r.ok).toBe(true)
    expect(createColindante).toHaveBeenCalledTimes(1)
    const call = createColindante.mock.calls[0]![0] as { data: Record<string, unknown> }
    expect(call.data.notificaA).toBe('Municipal')
    expect(call.data.nomenclatura).toBe('18-88/002')
  })
})

describe('updateExpedienteFull — transacción y respuesta', () => {
  // SPEC-090: All writes happen inside a single $transaction
  it('SPEC-090: todos los writes ocurren dentro de $transaction', async () => {
    const transactionFn = vi.fn((fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock))
    const { prisma: prismaMock } = await vi.importMock<{ prisma: { $transaction: unknown } }>('@/lib/prisma')
    prismaMock.$transaction = transactionFn as unknown

    await updateExpedienteFull(buildInput())
    // The transaction spy wraps all writes — txExpedienteUpdate is called inside
    expect(txExpedienteUpdate).toHaveBeenCalled()
  })

  // SPEC-091: Returns { ok: true, message } on success
  it('SPEC-091: devuelve { ok: true, message } en caso exitoso', async () => {
    const r = await updateExpedienteFull(buildInput())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(typeof r.message).toBe('string')
      expect(r.message.length).toBeGreaterThan(0)
    }
  })
})
