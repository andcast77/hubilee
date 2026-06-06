/**
 * Integration tests para el selector dual-engine en
 * `GET /(protected)/expedientes/[id]/descargar/[tipo]`.
 *
 * F4: ya no hay conversión DOCX→PDF ni fallback a legacy; `engine=legacy`
 * o tipo excluido de `PDF_NATIVE_TYPES` (cadena vacía) → 501
 * `legacy_pdf_removido`.
 */

import type { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getSessionUserIdMock = vi.fn()
vi.mock('@/lib/auth/session', () => ({
  getSessionUserId: () => getSessionUserIdMock(),
}))

const findFirstMock = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    expediente: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
    },
  },
}))

const { readFileMock } = vi.hoisted(() => ({
  readFileMock: vi.fn(),
}))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    readFile: (...args: unknown[]) => readFileMock(...args),
  }
})

import { GET } from '@/app/(protected)/expedientes/[id]/descargar/[tipo]/route'

const ORIGINAL_ENV = { ...process.env }

function setEnv(env: Record<string, string | undefined>): void {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
}

function buildRequest(query: Record<string, string> = {}): NextRequest {
  const params = new URLSearchParams(query)
  return {
    nextUrl: {
      searchParams: {
        get(key: string) {
          return params.get(key)
        },
      },
    },
  } as unknown as NextRequest
}

const profesionalRow = {
  displayName: 'Juan Perez',
  professionalTitle: 'AGRIMENSOR',
  sexo: 'M',
  cuit: '20-12345678-9',
  dni: '12345678',
  addressLine1: 'Calle Falsa 100',
  addressLine2: '',
  locality: 'Capital',
  postalCode: '5400',
  province: 'San Juan',
  phone: '264-5550000',
  whatsapp: '',
  professionalEmail: 'juan@example.com',
  registrations: [
    { licenseNumber: '1234', jurisdiction: 'San Juan', createdAt: new Date('2020-01-01') },
  ],
}

const notaHidraulicaRow = {
  nomenclaturaCatastral: '04-12-345-678',
  objetoExpedienteId: 'mensura_particular',
  motivoHidraulica: 'Linea uno motivo presentacion.',
  principalProfessional: profesionalRow,
}

const ordenTrabajoRow = {
  nomenclaturaCatastral: '04-12-345-678',
  objetoExpedienteId: 'mensura_particular',
  fechaOrdenTrabajo: '2026-03-15',
  parcial: false,
  domicilioParcela: 'Calle Sarmiento 200',
  ordenantes: [
    {
      orden: 1,
      nombre: 'Maria Lopez',
      documento: '11223344',
      sexo: 'F',
      cuit: '27-11223344-0',
      domicilio: 'Av. Sarmiento 200',
      caracter: 'titular',
    },
  ],
  principalProfessional: profesionalRow,
  secondProfessional: null,
}

beforeEach(() => {
  setEnv({ BARO_PDF_ENGINE: undefined, PDF_NATIVE_TYPES: undefined })
  getSessionUserIdMock.mockReset()
  findFirstMock.mockReset()
  readFileMock.mockReset()
})

afterEach(() => {
  setEnv({
    BARO_PDF_ENGINE: ORIGINAL_ENV.BARO_PDF_ENGINE,
    PDF_NATIVE_TYPES: ORIGINAL_ENV.PDF_NATIVE_TYPES,
  })
})

describe('engine selector — modo native', () => {
  it('renderiza con engine nativo cuando hay renderer registrado para el tipo', async () => {
    setEnv({ BARO_PDF_ENGINE: 'native' })
    getSessionUserIdMock.mockResolvedValue('user-1')
    findFirstMock.mockResolvedValue(notaHidraulicaRow)

    const res = await GET(buildRequest({ format: 'pdf' }), {
      params: Promise.resolve({ id: 'm-1', tipo: 'nota-hidraulica' }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    const buf = Buffer.from(await res.arrayBuffer())
    expect(buf.subarray(0, 5).toString('utf8')).toBe('%PDF-')
  })

  it('responde 200 para tipos F2 con renderer registrado (edicto)', async () => {
    setEnv({ BARO_PDF_ENGINE: 'native' })
    getSessionUserIdMock.mockResolvedValue('user-1')
    findFirstMock.mockResolvedValue({
      nomenclaturaCatastral: '04-12-345-678',
      objetoExpedienteId: 'mensura_particular',
      propietario: 'Maria Lopez',
      parcial: false,
      domicilioParcela: 'Calle Sarmiento 200',
      lugarReunion: 'Esquina Sarmiento y Mendoza',
      toleranciaActa: '15 minutos',
      actaNotarialFecha: '2026-03-15T10:00:00.000Z',
      llevPublicacionEdictos: true,
      medioPublicacion: 'Diario de Cuyo',
      publicacionEdictoFecha: '2026-03-10',
      principalProfessional: profesionalRow,
      secondProfessional: null,
      colindantes: [
        {
          orden: 1,
          rumbo: 'Norte',
          distancia: '20.00',
          colindante: 'Vecino',
          descripcion: '',
          notificaA: 'Vecino',
          nomenclatura: '04-12-345-001',
        },
      ],
    })

    const res = await GET(buildRequest({ format: 'pdf' }), {
      params: Promise.resolve({ id: 'm-1', tipo: 'edicto' }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('responde 200 para tipos F3 con renderer registrado (acta)', async () => {
    setEnv({ BARO_PDF_ENGINE: 'native' })
    getSessionUserIdMock.mockResolvedValue('user-1')
    findFirstMock.mockResolvedValue({
      nomenclaturaCatastral: '04-12-345-678',
      objetoExpedienteId: 'mensura_particular',
      domicilioParcela: 'Calle Sarmiento 200',
      propietario: 'Maria Lopez',
      inscripcionDominio: 'Matricula 12345',
      parcial: false,
      publicacionEdictoFecha: '2026-03-10',
      publicacionEdictoNumero: 'BO-2026-1234',
      boletinOficialNota: '',
      medioPublicacion: 'Diario de Cuyo',
      actaNotarialFecha: '2026-03-15T10:00:00.000Z',
      lugarReunion: 'Esquina Sarmiento y Mendoza',
      toleranciaActa: '15 minutos',
      publicacionActaObservaciones: '',
      llevPublicacionEdictos: true,
      ordenantes: [
        {
          orden: 1,
          nombre: 'Maria Lopez',
          documento: '11223344',
          sexo: 'F',
          cuit: '27-11223344-0',
          domicilio: 'Av. Sarmiento 200',
          caracter: 'titular',
        },
      ],
      principalProfessional: profesionalRow,
      secondProfessional: null,
    })

    const res = await GET(buildRequest({ format: 'pdf' }), {
      params: Promise.resolve({ id: 'm-1', tipo: 'acta' }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('responde 200 para tipos F3 con renderer registrado (citacion-colindantes)', async () => {
    setEnv({ BARO_PDF_ENGINE: 'native' })
    getSessionUserIdMock.mockResolvedValue('user-1')
    findFirstMock.mockResolvedValue({
      nomenclaturaCatastral: '04-12-345-678',
      objetoExpedienteId: 'mensura_particular',
      propietario: 'Maria Lopez',
      colindantes: [
        {
          orden: 1,
          rumbo: 'Norte',
          distancia: '20.00',
          colindante: 'Vecino',
          descripcion: '',
          notificaA: 'Vecino',
          nomenclatura: '04-12-345-001',
        },
      ],
      principalProfessional: profesionalRow,
    })

    const res = await GET(buildRequest({ format: 'pdf' }), {
      params: Promise.resolve({ id: 'm-1', tipo: 'citacion-colindantes' }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
  })
})

describe('engine selector — modo auto', () => {
  it('usa engine nativo cuando el tipo está en PDF_NATIVE_TYPES y hay renderer', async () => {
    setEnv({ BARO_PDF_ENGINE: 'auto', PDF_NATIVE_TYPES: 'nota-hidraulica' })
    getSessionUserIdMock.mockResolvedValue('user-1')
    findFirstMock.mockResolvedValue(notaHidraulicaRow)

    const res = await GET(buildRequest({ format: 'pdf' }), {
      params: Promise.resolve({ id: 'm-1', tipo: 'nota-hidraulica' }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('responde 501 legacy_pdf_removido cuando auto excluye el tipo (PDF_NATIVE_TYPES vacío)', async () => {
    setEnv({ BARO_PDF_ENGINE: 'auto', PDF_NATIVE_TYPES: '' })
    getSessionUserIdMock.mockResolvedValue('user-1')
    findFirstMock.mockResolvedValue(notaHidraulicaRow)

    const res = await GET(buildRequest({ format: 'pdf' }), {
      params: Promise.resolve({ id: 'm-1', tipo: 'nota-hidraulica' }),
    })

    expect(res.status).toBe(501)
    const body = await res.text()
    expect(body).toMatch(/retirada|LibreOffice|motor nativo/i)
  })

  it('ante fallo nativo recuperable NO hay fallback legacy (F4)', async () => {
    setEnv({ BARO_PDF_ENGINE: 'auto', PDF_NATIVE_TYPES: 'nota-hidraulica' })
    getSessionUserIdMock.mockResolvedValue('user-1')
    findFirstMock.mockResolvedValue(null)

    const res = await GET(buildRequest({ format: 'pdf' }), {
      params: Promise.resolve({ id: 'm-1', tipo: 'nota-hidraulica' }),
    })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('mantiene filename estable entre dos respuestas nativas (paridad de naming)', async () => {
    getSessionUserIdMock.mockResolvedValue('user-1')
    setEnv({ BARO_PDF_ENGINE: 'auto', PDF_NATIVE_TYPES: 'nota-hidraulica' })
    findFirstMock.mockResolvedValue(notaHidraulicaRow)
    const a = await GET(buildRequest({ format: 'pdf' }), {
      params: Promise.resolve({ id: 'm-1', tipo: 'nota-hidraulica' }),
    })
    const b = await GET(buildRequest({ format: 'pdf' }), {
      params: Promise.resolve({ id: 'm-1', tipo: 'nota-hidraulica' }),
    })
    expect(a.headers.get('Content-Disposition')).toBe(b.headers.get('Content-Disposition'))
    expect(a.headers.get('Content-Disposition')).toContain('04-12-345-678')
  })

  it('NO hace fallback a legacy ante error de datos (datos_faltantes orden-trabajo)', async () => {
    setEnv({ BARO_PDF_ENGINE: 'auto', PDF_NATIVE_TYPES: 'orden-trabajo' })
    getSessionUserIdMock.mockResolvedValue('user-1')
    findFirstMock.mockResolvedValue({
      ...ordenTrabajoRow,
      fechaOrdenTrabajo: null,
    })

    const res = await GET(buildRequest({ format: 'pdf' }), {
      params: Promise.resolve({ id: 'm-1', tipo: 'orden-trabajo' }),
    })

    expect(res.status).toBe(422)
  })
})

describe('engine selector — modo legacy', () => {
  it('BARO_PDF_ENGINE=legacy con format=pdf → 501 (pipeline retirado)', async () => {
    setEnv({ BARO_PDF_ENGINE: 'legacy', PDF_NATIVE_TYPES: 'nota-hidraulica' })
    getSessionUserIdMock.mockResolvedValue('user-1')
    findFirstMock.mockResolvedValue(notaHidraulicaRow)

    const res = await GET(buildRequest({ format: 'pdf' }), {
      params: Promise.resolve({ id: 'm-1', tipo: 'nota-hidraulica' }),
    })

    expect(res.status).toBe(501)
  })
})
