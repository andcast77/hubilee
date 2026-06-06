'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { createStore, useStore, type StoreApi } from 'zustand'

import type { ColindanteNotifica } from '@/lib/expediente/schemas'

// ─── field types ────────────────────────────────────────────────────────────

export type DatosFields = {
  actuantesIds: string[]
  objetoExpedienteId: string
  nomenclaturaCatastral: string
  planoAntecedente: string
  loteFraccion: string
  domicilioParcela: string
  parcial: boolean
  soloOrdenTrabajo: boolean
  fechaOrdenTrabajo: string
  propietario: string
  domicilioPropietario: string
  inscripcionDominio: string
  naturalezaActo: string
  memoriaObservaciones: string
  motivoHidraulica: string
  motivoFiscalia: string
  municipio: string
  requiereVisacionMunicipal: boolean
}

export type PublicacionFields = {
  publicacionEdictoFecha: string
  publicacionEdictoNumero: string
  boletinOficialNota: string
  actaNotarialNumero: string
  actaNotarialFecha: string
  publicacionActaObservaciones: string
  lugarReunion: string
  toleranciaActa: string
  llevPublicacionEdictos: boolean
  medioPublicacion: string
}

export type ColNomenclaturaRow = {
  _key: string
  id: string | null
  nomenclatura: string
  rumbo: string
}

export type ColRow = {
  _key: string
  id: string | null
  nomenclaturas: ColNomenclaturaRow[]
  distancia: string
  colindante: string
  descripcion: string
  notificaA: ColindanteNotifica
  domicilioParcelaColindante: string
  domicilioTitularColindante: string
  dirigidoA: string
}

export type TitRow = {
  _key: string
  id: string | null
  instrumento: string
  matricula: string
  fechaTitulo: string
  observaciones: string
}

export type OrdenanteRow = {
   _key: string
   id: string | null
   nombre: string
   /** DNI u otro documento de identidad (campo Prisma `documento`). */
   documento: string
   sexo: string
   cuit: string
   domicilio: string
   caracter: string
   esPropietario: boolean
}

/** Propietario creado directamente desde la sección Propietarios (no vinculado a un ordenante). */
export type PropietarioDirecto = {
  _key: string
  nombre: string
  domicilio: string
}

export type LinderoPuntoRow = {
  _key: string
  id: string | null
  tipo: 'CARDINAL' | 'ESPECIAL'
  direccion: string
  descripcion: string
  medida: string
}

export type LinderosFields = {
  id: string | null
  superficieTotal: string
  superficieSegun: string
  fechaRelacionTitulos: string
  observacionesGenerales: string
  puntos: LinderoPuntoRow[]
}

// ─── store ──────────────────────────────────────────────────────────────────

export type ExpedienteStore = {
  expedienteId: string
  datos: DatosFields
  publicacion: PublicacionFields
  colindantes: ColRow[]
  titulos: TitRow[]
  ordenantes: OrdenanteRow[]
  propietariosDirectos: PropietarioDirecto[]
  linderos: LinderosFields
  setDatos: (partial: Partial<DatosFields>) => void
  setPublicacion: (partial: Partial<PublicacionFields>) => void
  setColindantes: (rows: ColRow[]) => void
  setTitulos: (rows: TitRow[]) => void
  setOrdenantes: (rows: OrdenanteRow[]) => void
  setPropietariosDirectos: (rows: PropietarioDirecto[]) => void
  setLinderos: (partial: Partial<LinderosFields>) => void
}

type InitialData = {
  expedienteId: string
  datos: DatosFields
  publicacion: PublicacionFields
  colindantes: ColRow[]
  titulos: TitRow[]
  ordenantes: OrdenanteRow[]
  propietariosDirectos?: PropietarioDirecto[]
  linderos: LinderosFields
}

function makeExpedienteStore(init: InitialData) {
  return createStore<ExpedienteStore>((set) => ({
    ...init,
    propietariosDirectos: init.propietariosDirectos ?? [],
    setDatos: (partial) => set((s) => ({ datos: { ...s.datos, ...partial } })),
    setPublicacion: (partial) => set((s) => ({ publicacion: { ...s.publicacion, ...partial } })),
    setColindantes: (rows) => set({ colindantes: rows }),
    setTitulos: (rows) => set({ titulos: rows }),
    setOrdenantes: (rows) => set({ ordenantes: rows }),
    setPropietariosDirectos: (rows) => set({ propietariosDirectos: rows }),
    setLinderos: (partial) => set((s) => ({ linderos: { ...s.linderos, ...partial } })),
  }))
}

// ─── context ────────────────────────────────────────────────────────────────

const ExpedienteStoreContext = createContext<StoreApi<ExpedienteStore> | null>(null)

export function ExpedienteProvider({
  initial,
  children,
}: {
  initial: InitialData
  children: ReactNode
}) {
  const [store] = useState(() => makeExpedienteStore(initial))
  return <ExpedienteStoreContext.Provider value={store}>{children}</ExpedienteStoreContext.Provider>
}

export function useExpedienteStore<T>(selector: (state: ExpedienteStore) => T): T {
  const store = useContext(ExpedienteStoreContext)
  if (!store) throw new Error('useExpedienteStore: missing ExpedienteProvider')
  return useStore(store, selector)
}
