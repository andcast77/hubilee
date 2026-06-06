import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ExpedienteDatosGeneralesForm,
  type ExpedienteDatosSnapshot,
} from '@/components/app/expedientes/expediente-datos-generales-form'
import { ExpedienteProvider } from '@/stores/expediente-store'
import type { ProfessionalForForm } from '@/components/app/expedientes/expediente-datos-generales-form'

const TITULAR_ID = 'cmdevtitularprofessionalseed01'

const initial: ExpedienteDatosSnapshot = {
  id: 'expediente-exp-99',
  actuantesProfessionalIds: [TITULAR_ID],
  objetoExpedienteId: 'cabida_unica',
  nomenclaturaCatastral: '99-99/999999',
  nomenclaturaAnulada: true,
  planoAntecedente: 'P-1',
  loteFraccion: 'Lote A',
  domicilioParcela: 'Calle 1',
  parcial: true,
  soloOrdenTrabajo: false,
  fechaOrdenTrabajo: null,
  propietario: 'Dueño Test',
  domicilioPropietario: 'Dom prop',
  inscripcionDominio: 'Ins 1',
  naturalezaActo: 'Nat',
  memoriaObservaciones: 'Memo',
  motivoHidraulica: 'H',
  motivoFiscalia: 'F',
  municipio: 'Capital',
  requiereVisacionMunicipal: true,
}

const mockProfessionals: ProfessionalForForm[] = [
  {
    id: TITULAR_ID,
    displayName: 'Prof Titular',
    professionalTitle: 'AGRIMENSOR',
    titleGrammarGender: 'MASCULINO',
    locality: '',
    phone: null,
    professionalEmail: null,
    primaryMatricula: null,
    primaryJurisdiction: null,
    isTitular: true,
    active: true,
  },
]

const emptyLinderos = {
  id: null,
  superficieTotal: '',
  superficieSegun: '',
  fechaRelacionTitulos: '',
  observacionesGenerales: '',
  puntos: [],
}

function renderWithStore(
  overrides: Partial<ExpedienteDatosSnapshot> = {},
  professionals: ProfessionalForForm[] = mockProfessionals
) {
  const snap = { ...initial, ...overrides }
  return render(
    <ExpedienteProvider
      initial={{
        expedienteId: snap.id,
        datos: {
          actuantesIds: [...snap.actuantesProfessionalIds],
          objetoExpedienteId: snap.objetoExpedienteId,
          nomenclaturaCatastral: snap.nomenclaturaCatastral,
          nomenclaturaAnulada: snap.nomenclaturaAnulada,
          planoAntecedente: snap.planoAntecedente ?? '',
          loteFraccion: snap.loteFraccion ?? '',
          domicilioParcela: snap.domicilioParcela ?? '',
          parcial: snap.parcial,
          soloOrdenTrabajo: snap.soloOrdenTrabajo,
          fechaOrdenTrabajo: snap.fechaOrdenTrabajo ?? '',
          propietario: snap.propietario,
          domicilioPropietario: snap.domicilioPropietario ?? '',
          inscripcionDominio: snap.inscripcionDominio ?? '',
          naturalezaActo: snap.naturalezaActo ?? '',
          memoriaObservaciones: snap.memoriaObservaciones ?? '',
          motivoHidraulica: snap.motivoHidraulica ?? '',
          motivoFiscalia: snap.motivoFiscalia ?? '',
          municipio: snap.municipio ?? '',
          requiereVisacionMunicipal: snap.requiereVisacionMunicipal,
        },
        publicacion: {
          publicacionEdictoFecha: '',
          publicacionEdictoNumero: '',
          boletinOficialNota: '',
          actaNotarialNumero: '',
          actaNotarialFecha: '',
          publicacionActaObservaciones: '',
          lugarReunion: '',
          toleranciaActa: '',
          llevPublicacionEdictos: false,
          medioPublicacion: '',
        },
        colindantes: [],
        titulos: [],
        ordenantes: [],
        linderos: emptyLinderos,
      }}
    >
      <ExpedienteDatosGeneralesForm initial={snap} professionals={professionals} />
    </ExpedienteProvider>
  )
}

describe('ExpedienteDatosGeneralesForm', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('muestra valores iniciales del expediente', () => {
    renderWithStore()
    expect(screen.getByRole('textbox', { name: /nomenclatura catastral/i })).toHaveValue(
      '99-99/999999'
    )
    expect(screen.getByText('No hay propietarios cargados.')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /nomenclatura anulada/i })).toBeChecked()
  })

  it('muestra el campo de fecha de orden de trabajo siempre', () => {
    renderWithStore({ soloOrdenTrabajo: false, fechaOrdenTrabajo: null })
    expect(screen.getByLabelText(/fecha orden de trabajo/i)).toBeInTheDocument()
  })

  it('muestra la fecha de orden de trabajo cuando viene cargada', () => {
    renderWithStore({ fechaOrdenTrabajo: '2024-03-15', soloOrdenTrabajo: true })
    expect(screen.getByLabelText(/fecha orden de trabajo/i)).toHaveValue('2024-03-15')
  })
})
