import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getObjetoExpedienteById } from '@/lib/expediente/catalogs'
import type {
  ExpedienteDatosSnapshot,
  ProfessionalForForm,
} from '@/components/app/expedientes/expediente-datos-generales-form'
import type { ExpedienteColindanteRow } from '@/components/app/expedientes/expediente-colindantes-panel'
import type { ExpedientePublicacionActaSnapshot } from '@/components/app/expedientes/expediente-publicacion-acta-panel'
import type { LinderosInitial } from '@/components/app/expedientes/expediente-lindero-panel'
import { ExpedienteShell } from '@/components/app/expedientes/expediente-shell'
import { parseActaNotarialFechaToDate } from '@/lib/expediente/acta-notarial-fecha'
import type { ColindanteNotifica } from '@/lib/expediente/schemas'
import { getSessionUserId } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import type { OrdenanteRow } from '@/stores/expediente-store'
import {
  pickRepresentativeRegistration,
  summarizeProfessionalTitles,
} from '@/lib/professional/registration-pick'

function mapNotificaColindanteDb(raw: string): ColindanteNotifica {
  if (raw === 'Particular' || raw === 'Fiscalía' || raw === 'Ente') return raw
  if (raw === 'Municipal') return 'Ente'
  return 'Particular'
}

export default async function ExpedienteDetallePage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>
}>) {
  const { id } = await params
  const userId = await getSessionUserId()
  if (!userId) notFound()

  const registrationOrderBy = [{ jurisdiction: 'asc' as const }, { licenseNumber: 'asc' as const }]

  const [m, rawProfessionals] = await Promise.all([
    prisma.expediente.findFirst({
      where: { id, accountOwnerId: userId },
      include: {
        actuantes: { orderBy: { orden: 'asc' }, select: { professionalId: true } },
        colindantes: {
          orderBy: { orden: 'asc' },
          include: { nomenclaturas: { orderBy: { orden: 'asc' } } },
        },
        ordenantes: { orderBy: { orden: 'asc' } },
        linderos: { include: { puntos: { orderBy: { orden: 'asc' } } } },
        accountOwner: { select: { titularProfessionalId: true } },
      },
    }),
    prisma.professional.findMany({
      where: { accountOwnerId: userId },
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        displayName: true,
        sexo: true,
        professionalTitle: true,
        locality: true,
        phone: true,
        professionalEmail: true,
        active: true,
        registrations: {
          orderBy: registrationOrderBy,
          select: {
            licenseNumber: true,
            jurisdiction: true,
            bodyName: true,
            createdAt: true,
          },
        },
      },
    }),
  ])

  if (!m) notFound()

  const titularId = m.accountOwner.titularProfessionalId
  const professionals: ProfessionalForForm[] = rawProfessionals.map((p) => {
    const rep = pickRepresentativeRegistration(p.registrations)
    const titles = summarizeProfessionalTitles(p.professionalTitle, p.sexo)
    return {
      id: p.id,
      displayName: p.displayName,
      professionalTitle: titles.professionalTitle,
      titleGrammarGender: titles.titleGrammarGender,
      locality: p.locality,
      phone: p.phone ?? null,
      professionalEmail: p.professionalEmail ?? null,
      primaryMatricula: rep?.licenseNumber ?? null,
      primaryJurisdiction: rep?.jurisdiction ?? null,
      isTitular: p.id === titularId,
      active: p.active,
    }
  })

  const actuantesProfessionalIds = m.actuantes.map((a) => a.professionalId)

  const colindantes: ExpedienteColindanteRow[] = m.colindantes.map((c) => ({
    id: c.id,
    orden: c.orden,
    nomenclaturas: c.nomenclaturas.map((n) => ({
      id: n.id,
      orden: n.orden,
      nomenclatura: n.nomenclatura,
      rumbo: n.rumbo,
    })),
    distancia: c.distancia,
    colindante: c.colindante,
    descripcion: c.descripcion,
    notificaA: mapNotificaColindanteDb(c.notificaA),
    domicilioParcelaColindante: c.domicilioParcelaColindante,
    domicilioTitularColindante: c.domicilioTitularColindante,
    dirigidoA: c.dirigidoA,
  }))

const ordenantes: OrdenanteRow[] = m.ordenantes.map((o) => ({
     _key: o.id,
     id: o.id,
     nombre: o.nombre,
     documento: o.documento,
     sexo: o.sexo,
     cuit: o.cuit,
     domicilio: o.domicilio,
     caracter: o.caracter,
     esPropietario: o.esPropietario,
   }))

  const linderos: LinderosInitial = m.linderos
    ? {
        id: m.linderos.id,
        superficieTotal: m.linderos.superficieTotal,
        superficieSegun: m.linderos.superficieSegun,
        fechaRelacionTitulos: m.linderos.fechaRelacionTitulos,
        observacionesGenerales: m.linderos.observacionesGenerales,
        puntos: m.linderos.puntos.map((p) => ({
          _key: p.id,
          id: p.id,
          tipo: p.tipo as 'CARDINAL' | 'ESPECIAL',
          direccion: p.direccion,
          descripcion: p.descripcion,
          medida: p.medida,
        })),
      }
    : null

  const publicacionActa: ExpedientePublicacionActaSnapshot = {
    publicacionEdictoFecha: m.publicacionEdictoFecha,
    publicacionEdictoNumero: m.publicacionEdictoNumero,
    boletinOficialNota: m.boletinOficialNota,
    actaNotarialNumero: m.actaNotarialNumero,
    actaNotarialFecha: m.actaNotarialFecha,
    publicacionActaObservaciones: m.publicacionActaObservaciones,
    lugarReunion: m.lugarReunion,
    toleranciaActa: m.toleranciaActa,
    llevPublicacionEdictos: m.llevPublicacionEdictos,
    medioPublicacion: m.medioPublicacion,
  }

  const datosSnapshot: ExpedienteDatosSnapshot = {
    id: m.id,
    actuantesProfessionalIds,
    objetoExpedienteId: m.objetoExpedienteId,
    nomenclaturaCatastral: m.nomenclaturaCatastral,
    planoAntecedente: m.planoAntecedente,
    loteFraccion: m.loteFraccion,
    domicilioParcela: m.domicilioParcela,
    parcial: m.parcial,
    soloOrdenTrabajo: m.soloOrdenTrabajo,
    fechaOrdenTrabajo: m.fechaOrdenTrabajo,
    propietario: m.propietario,
    domicilioPropietario: m.domicilioPropietario,
    inscripcionDominio: m.inscripcionDominio,
    naturalezaActo: m.naturalezaActo,
    memoriaObservaciones: m.memoriaObservaciones,
    motivoHidraulica: m.motivoHidraulica,
    motivoFiscalia: m.motivoFiscalia,
    municipio: m.municipio,
    requiereVisacionMunicipal: m.requiereVisacionMunicipal,
  }

  const tipo = getObjetoExpedienteById(m.objetoExpedienteId)?.label ?? m.objetoExpedienteId
  const actaFechaParsed = m.actaNotarialFecha
    ? parseActaNotarialFechaToDate(m.actaNotarialFecha)
    : null
  const fecha = (actaFechaParsed ?? new Date(m.createdAt)).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--background)]/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-[var(--app-panel-ring)]">
          <p className="text-sm text-[var(--color-muted)]">Cargando expediente…</p>
        </div>
      }
    >
      <ExpedienteShell
        tipo={tipo}
        fecha={fecha}
        datosSnapshot={datosSnapshot}
        colindantes={colindantes}
        ordenantes={ordenantes}
        linderos={linderos}
        publicacionActa={publicacionActa}
        professionals={professionals}
      />
    </Suspense>
  )
}
