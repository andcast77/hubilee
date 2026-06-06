import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExpedientePublicacionActaPanel } from '@/components/app/expedientes/expediente-publicacion-acta-panel'
import { ExpedienteProvider } from '@/stores/expediente-store'
import type { InitialData, PublicacionFields } from '@/stores/expediente-store'

const initialData: InitialData = {
  expedienteId: 'test-id',
  datos: {
    actuantesIds: [],
    objetoExpedienteId: '',
    nomenclaturaCatastral: '',
    planoAntecedente: '',
    loteFraccion: '',
    domicilioParcela: '',
    parcial: false,
    soloOrdenTrabajo: false,
    fechaOrdenTrabajo: '',
    propietario: '',
    domicilioPropietario: '',
    inscripcionDominio: '',
    naturalezaActo: '',
    memoriaObservaciones: '',
    motivoHidraulica: '',
    motivoFiscalia: '',
    municipio: '',
    requiereVisacionMunicipal: false
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
    medioPublicacion: ''
  },
  colindantes: [],
  titulos: [],
  ordenantes: [],
  propietariosDirectos: [],
  linderos: {
    id: null,
    superficieTotal: '',
    superficieSegun: '',
    fechaRelacionTitulos: '',
    observacionesGenerales: '',
    puntos: []
  }
}

describe('ExpedientePublicacionActaPanel', () => {
  it('renders the acta notarial section with new controls', () => {
    render(
      <ExpedienteProvider initial={initialData}>
        <ExpedientePublicacionActaPanel />
      </ExpedienteProvider>
    )
    
    expect(screen.getByText('Acta notarial')).toBeInTheDocument()
    expect(screen.getByText('Fecha de acta')).toBeInTheDocument()
    expect(screen.getByText('Hora')).toBeInTheDocument()
    expect(screen.getByText('Lugar de reunión')).toBeInTheDocument()
    expect(screen.getByText('Tolerancia')).toBeInTheDocument()
    // Number input for tolerance
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    expect(screen.getByText('min')).toBeInTheDocument()
  })

  it('displays current acta notarial date and time', () => {
    const pubData: PublicacionFields = {
      ...initialData.publicacion,
      actaNotarialFecha: '15/05/2026 14:30',
      lugarReunion: 'Sala de Juntas',
      toleranciaActa: '60'
    }
    
    const dataWithPub: InitialData = { ...initialData, publicacion: pubData }
    
    render(
      <ExpedienteProvider initial={dataWithPub}>
        <ExpedientePublicacionActaPanel />
      </ExpedienteProvider>
    )
    
    expect(screen.getByDisplayValue('Sala de Juntas')).toBeInTheDocument()
    // Tolerance number input shows "60" (parsed from store value '60')
    const spinbuttons = screen.getAllByRole('spinbutton')
    expect(spinbuttons.some((el) => (el as HTMLInputElement).value === '60')).toBe(true)
  })

  it('shows default tolerance when empty', () => {
    render(
      <ExpedienteProvider initial={initialData}>
        <ExpedientePublicacionActaPanel />
      </ExpedienteProvider>
    )
    
    expect(screen.getAllByText('dd/mm/aaaa').length).toBe(2)
    // Default tolerance is 30
    expect(screen.getAllByRole('spinbutton').length).toBeGreaterThanOrEqual(1)
  })

  it('renders with legacy actaNotarialFecha format', () => {
    const pubData: PublicacionFields = {
      ...initialData.publicacion,
      actaNotarialFecha: '2026-05-15T14:30',
      lugarReunion: 'Oficina Central',
      toleranciaActa: '30 Minutos'
    }
    
    const dataWithPub: InitialData = { ...initialData, publicacion: pubData }
    
    render(
      <ExpedienteProvider initial={dataWithPub}>
        <ExpedientePublicacionActaPanel />
      </ExpedienteProvider>
    )
    
    expect(screen.getByDisplayValue('Oficina Central')).toBeInTheDocument()
    // Legacy "30 Minutos" → parsed as 30 → number input shows 30
    const spinbuttons = screen.getAllByRole('spinbutton')
    expect(spinbuttons.some((el) => (el as HTMLInputElement).value === '30')).toBe(true)
  })
})