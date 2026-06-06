import type { ExpedienteOrdenTrabajoQueryRow } from '@/lib/expediente/docx/document-render-data'
import {
  expedienteRowToOrdenTrabajoRenderData,
  professionalTitleEs,
} from '@/lib/expediente/docx/document-render-data'
import { renderOrdenDeTrabajo } from '@/lib/expediente/docx/renderers/orden-trabajo'
import { describe, expect, it } from 'vitest'

/** Mínimos para mapper + renderer alineados a `findFirst` con include de orden de trabajo. */
function fixtureRow(partial?: {
  segunda?: boolean
  parcial?: boolean
  principalSexo?: string
}): ExpedienteOrdenTrabajoQueryRow {
  const principalProf = {
    id: 'p1',
    accountOwnerId: 'u',
    professionalTitle: 'AGRIMENSOR' as const,
    displayName: 'Ana Actúa',
    dni: '30111222',
    sexo: partial?.principalSexo ?? 'Femenino',
    phone: '2645000000',
    whatsapp: null as string | null,
    professionalEmail: 'ana@test.local',
    addressLine1: 'Calle 1',
    addressLine2: null as string | null,
    locality: 'Capital',
    province: 'San Juan',
    postalCode: '5400',
    websiteUrl: null as string | null,
    cuit: null as string | null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    registrations: [
      {
        id: 'r1',
        professionalId: 'p1',
        licenseNumber: 'MCP-1',
        jurisdiction: 'San Juan',
        bodyName: null as string | null,
        createdAt: new Date(2020, 0, 1),
        updatedAt: new Date(2020, 0, 1),
      },
    ],
  }

  const secondProf =
    partial?.segunda ?
      ({
        id: 'p2',
        accountOwnerId: 'u',
        professionalTitle: 'INGENIERO_AGRIMENSOR' as const,
        displayName: 'Bob Ayuda',
        dni: '29111222',
        sexo: 'Masculino',
        phone: null as string | null,
        whatsapp: null as string | null,
        professionalEmail: null as string | null,
        addressLine1: 'Calle 2',
        addressLine2: '',
        locality: 'Rivadavia',
        province: 'San Juan',
        postalCode: null as string | null,
        websiteUrl: null as string | null,
        cuit: '27999999999',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        registrations: [
          {
            id: 'r2',
            professionalId: 'p2',
            licenseNumber: 'MCP-2',
            jurisdiction: 'SAN JUAN',
            bodyName: null as string | null,
            createdAt: new Date(2021, 0, 1),
            updatedAt: new Date(2021, 0, 1),
          },
        ],
      } as const)
    : null

  return {
    id: 'e1',
    accountOwnerId: 'u',
    principalProfessionalId: 'p1',
    secondProfessionalId: partial?.segunda ? 'p2' : null,
    principalProfessional: principalProf,
    secondProfessional: secondProf,
    status: 'DRAFT',
    objetoExpedienteId: 'cabida_unica',
    nomenclaturaCatastral: '18-88/418288',
    nomenclaturaAnulada: false,
    planoAntecedente: null,
    loteFraccion: null,
    domicilioParcela: null,
    parcial: partial?.parcial ?? false,
    soloOrdenTrabajo: true,
    propietario: 'X',
    domicilioPropietario: null,
    inscripcionDominio: null,
    naturalezaActo: null,
    memoriaObservaciones: null,
    motivoHidraulica: null,
    motivoFiscalia: null,
    municipio: null,
    requiereVisacionMunicipal: false,
    fechaOrdenTrabajo: '2024-06-01',
    lugarReunion: null,
    toleranciaActa: null,
    llevPublicacionEdictos: false,
    medioPublicacion: null,
    publicacionEdictoFecha: null,
    publicacionEdictoNumero: null,
    boletinOficialNota: null,
    actaNotarialNumero: null,
    actaNotarialFecha: null,
    publicacionActaObservaciones: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ordenantes: [
      {
        id: 'o1',
        expedienteId: 'e1',
        orden: 1,
        nombre: 'Cliente Uno',
        documento: '30-11222-4',
        sexo: 'Femenino',
        cuit: '27-11111111-1',
        domicilio: 'Calle Falsa 123',
        caracter: 'Vendedor',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  } as unknown as ExpedienteOrdenTrabajoQueryRow
}

describe('renderOrdenDeTrabajo', () => {
  it('professionalTitleEs según género gramatical', () => {
    expect(professionalTitleEs('AGRIMENSOR', 'MASCULINO')).toBe('Agrimensor')
    expect(professionalTitleEs('AGRIMENSOR', 'FEMENINO')).toBe('Agrimensora')
    expect(professionalTitleEs('INGENIERO_AGRIMENSOR', 'MASCULINO')).toBe('Ingeniero Agrimensor')
    expect(professionalTitleEs('INGENIERO_AGRIMENSOR', 'FEMENINO')).toBe('Ingeniera Agrimensora')
  })

  it('mapper deriva tituloEs del sexo del profesional', () => {
    expect(
      expedienteRowToOrdenTrabajoRenderData(fixtureRow({ principalSexo: 'Femenino' })).principal.tituloEs
    ).toBe('Agrimensora')
    expect(
      expedienteRowToOrdenTrabajoRenderData(fixtureRow({ principalSexo: 'Masculino' })).principal.tituloEs
    ).toBe('Agrimensor')
  })

  it('fecha: San Juan, dia numerico, mes en letras, año numerico', () => {
    const dto = expedienteRowToOrdenTrabajoRenderData(fixtureRow())
    expect(dto.fechaOrdenTrabajoLinea).toBe('San Juan, 1 de junio de 2024')
  })

  it('produce buffer .docx válido', async () => {
    const buf = await renderOrdenDeTrabajo(expedienteRowToOrdenTrabajoRenderData(fixtureRow()))
    expect(buf.subarray(0, 2).toString('utf8')).toBe('PK')
    expect(buf.length).toBeGreaterThan(2500)
  })

  it('con segundo profesional y parcial también genera', async () => {
    const buf = await renderOrdenDeTrabajo(
      expedienteRowToOrdenTrabajoRenderData(fixtureRow({ segunda: true, parcial: true }))
    )
    expect(buf.subarray(0, 2).toString('utf8')).toBe('PK')
    expect(buf.length).toBeGreaterThan(2600)
  })
})
