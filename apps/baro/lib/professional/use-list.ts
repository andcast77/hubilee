'use client'

import { useCallback, useEffect, useState } from 'react'
import type {
  ApiProfessionalListItem,
  ApiProfile,
} from '@/components/app/professional-profile-form'

/**
 * Hook que combina el profesional titular (de /api/auth/profile)
 * con los colaboradores (de /api/auth/associated-professionals)
 * en una lista unificada de todos los profesionales del usuario.
 */
export function useProfessionalsList() {
  const [professionals, setProfessionals] = useState<ApiProfessionalListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [titularId, setTitularId] = useState<string | null>(null)

  const loadProfessionals = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      // Cargar datos del titular
      const profileRes = await fetch('/api/auth/profile', { credentials: 'include' })
      const profileData = (await profileRes.json().catch(() => ({}))) as {
        profile?: ApiProfile | null
        message?: string
      }

      let professionalIdFromProfile: string | null = null
      if (profileRes.ok && profileData.profile) {
        professionalIdFromProfile = profileData.profile.id
        setTitularId(professionalIdFromProfile)
      }

      // Cargar lista de asociados
      const associatesRes = await fetch('/api/auth/associated-professionals', {
        credentials: 'include',
      })
      const associatesData = (await associatesRes.json().catch(() => ({}))) as {
        professionals?: ApiProfessionalListItem[]
        message?: string
      }

      let associates: ApiProfessionalListItem[] = []
      if (associatesRes.ok) {
        associates = associatesData.professionals ?? []
      }

      // Construir lista unificada: titular + asociados
      const allProfessionals: ApiProfessionalListItem[] = []

      // Añadir el titular si existe
      if (professionalIdFromProfile && profileData.profile) {
        allProfessionals.push({
          id: profileData.profile.id,
          displayName: profileData.profile.displayName,
          professionalTitle: profileData.profile.professionalTitle,
          titleGrammarGender: profileData.profile.titleGrammarGender ?? 'MASCULINO',
          locality: profileData.profile.locality ?? '',
          addressLine1: profileData.profile.addressLine1 ?? '',
          createdAt: profileData.profile.createdAt ?? '',
          updatedAt: profileData.profile.updatedAt ?? '',
          active: true, // El titular siempre está activo
        })
      }

      // Añadir todos los asociados
      allProfessionals.push(...associates)

      setProfessionals(allProfessionals)
    } catch (err) {
      setError('No se pudo cargar la lista de profesionales')
      console.error('Error loading professionals list:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfessionals()
  }, [loadProfessionals])

  const refetch = useCallback(() => {
    void loadProfessionals()
  }, [loadProfessionals])

  return { professionals, loading, error, refetch, titularId }
}
