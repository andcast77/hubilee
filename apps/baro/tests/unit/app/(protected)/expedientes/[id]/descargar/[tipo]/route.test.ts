import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/(protected)/expedientes/[id]/descargar/[tipo]/route'

const EXPEDIENTE_DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

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

const actaHandlerMock = vi.fn()
const ordenTrabajoHandlerMock = vi.fn()

vi.mock('@/lib/expediente/docx/renderer-registry', () => ({
  DYNAMIC_RENDERERS: {
    acta: (id: string, userId: string) => actaHandlerMock(id, userId),
    'orden-trabajo': (id: string, userId: string) =>
      ordenTrabajoHandlerMock(id, userId),
  },
}))

vi.mock('@/lib/expediente/descarga', () => ({
  EXPEDIENTE_DOCX_MIME:
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  parseExpedienteDownloadDocType: (raw: string) => {
    const ok = [
      'acta',
      'edicto',
      'citacion-colindantes',
      'relacion-titulo',
      'memoria-descriptiva',
      'nota-hidraulica',
      'nota-fiscalia',
      'orden-trabajo',
    ] as const
    return (ok as readonly string[]).includes(raw) ? raw : null
  },
  getExpedienteDownloadDocMeta: () => ({
    id: 'acta' as const,
    label: 'Acta',
    templateFileName: 'Tpl.docx',
    attachmentBasePrefix: 'ActaExpediente',
  }),
  resolveExpedienteDocTemplateAbsolutePath: () => 'D:\\fake\\Tpl.docx',
  buildExpedienteDocxAttachmentFilename: () => 'ActaExpediente_18-88_418288.docx',
  withExpedienteDocxPreviewDisposition: (res: NextResponse) => res,
}))

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

describe('GET /expedientes/[id]/descargar/[tipo]', () => {
  beforeEach(() => {
    actaHandlerMock.mockReset()
    ordenTrabajoHandlerMock.mockReset()
  })

  afterEach(() => {
    readFileMock.mockReset()
    getSessionUserIdMock.mockReset()
    findFirstMock.mockReset()
  })

  it('responde 404 sin sesión (sin filtrar existencia del expediente)', async () => {
    getSessionUserIdMock.mockResolvedValue(null)
    const res = await GET(buildRequest(), {
      params: Promise.resolve({ id: 'm-1', tipo: 'acta' }),
    })
    expect(res.status).toBe(404)
  })

  it('sirve bytes .docx con MIME Word cuando el titular coincide y format=docx', async () => {
    getSessionUserIdMock.mockResolvedValue('user-1')
    actaHandlerMock.mockResolvedValue(
      new NextResponse(new Uint8Array(Buffer.from('PK\x03\x04fake-docx')), {
        status: 200,
        headers: {
          'Content-Type': EXPEDIENTE_DOCX_MIME,
          'Content-Disposition':
            'attachment; filename="ActaExpediente_18-88_418288.docx"',
        },
      })
    )

    const res = await GET(buildRequest({ format: 'docx' }), {
      params: Promise.resolve({ id: 'm-1', tipo: 'acta' }),
    })

    expect(actaHandlerMock).toHaveBeenCalledWith('m-1', 'user-1')
    expect(readFileMock).not.toHaveBeenCalled()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe(EXPEDIENTE_DOCX_MIME)
    const cd = res.headers.get('Content-Disposition')
    expect(cd).toContain('attachment')
    expect(cd).toContain('ActaExpediente_18-88_418288.docx')
    const buf = Buffer.from(await res.arrayBuffer())
    expect(buf.subarray(0, 4).toString('utf8')).toBe('PK\x03\x04')
  })

  it('responde 404 si el expediente no pertenece al usuario', async () => {
    getSessionUserIdMock.mockResolvedValue('user-1')
    actaHandlerMock.mockResolvedValue(new NextResponse(null, { status: 404 }))

    const res = await GET(buildRequest({ format: 'docx' }), {
      params: Promise.resolve({ id: 'm-ajeno', tipo: 'acta' }),
    })
    expect(res.status).toBe(404)
    expect(readFileMock).not.toHaveBeenCalled()
  })

  it('orden-trabajo responde 422 si falta la fecha de orden de trabajo', async () => {
    getSessionUserIdMock.mockResolvedValue('user-1')
    ordenTrabajoHandlerMock.mockResolvedValue(
      new NextResponse(JSON.stringify({ code: 'datos_faltantes' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const res = await GET(buildRequest({ format: 'docx' }), {
      params: Promise.resolve({ id: 'm-1', tipo: 'orden-trabajo' }),
    })
    expect(res.status).toBe(422)
    expect(readFileMock).not.toHaveBeenCalled()
  })
})
