/**
 * Fixtures mínimos para tests DOCX (antes en expediente-pdf/renderers/fixtures).
 */

import type {
  OrdenTrabajoOrdenanteDto,
  OrdenTrabajoProfesionalDto,
  OrdenTrabajoRenderData,
} from '@/lib/expediente/docx/document-render-data'

export function makeProfesionalDto(
  overrides: Partial<OrdenTrabajoProfesionalDto> = {}
): OrdenTrabajoProfesionalDto {
  return {
    displayName: 'Juan Perez',
    tituloEs: 'Agrimensor',
    mcp: '1234',
    cuit: '20-12345678-9',
    dni: '12345678',
    direccionEstudioLinea: 'Calle Falsa 100, Capital, provincia de San Juan',
    direccionConsultasLinea: 'Calle Falsa 100, Capital, provincia de San Juan',
    celularLinea: '264-5550000',
    correoLinea: 'juan@example.com',
    horarioLinea: 'L-V 9-14',
    ...overrides,
  }
}

export function makeOrdenanteDto(
   overrides: Partial<OrdenTrabajoOrdenanteDto> = {}
 ): OrdenTrabajoOrdenanteDto {
   return {
     orden: 1,
     nombre: 'Maria Lopez',
     documento: '11223344',
     sexo: 'F',
     cuit: '27-11223344-0',
     domicilio: 'Av. Sarmiento 200, Capital',
     caracter: 'titular',
     esPropietario: false,
     ...overrides,
   }
 }

export function makeOrdenTrabajoFixture(
  overrides: Partial<OrdenTrabajoRenderData> = {}
): OrdenTrabajoRenderData {
  return {
    fechaOrdenTrabajoLinea: 'San Juan, 15 de marzo de 2026',
    ordenantes: [makeOrdenanteDto()],
    principal: makeProfesionalDto(),
    segundo: null,
    tipoMensuraLabel: 'Mensura Particular',
    nomenclaturaCatastral: '04-12-345-678',
    parcial: false,
    parcelaUbicacionLinea: 'Calle Sarmiento 200',
    ...overrides,
  }
}
