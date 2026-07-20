import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserPreferences } from '@/types'
import type { UpdateUserPreferencesInput } from '@/lib/validations/userPreferences'
import { localStorageUtils } from '@/lib/utils/localStorage'
import { getUserPreferences, updateUserPreferences as updateUserPreferencesApi } from '@/lib/services/userPreferencesService'
import { useUser } from '@/hooks/useUser'

export function useUserPreferences() {
  const { data: user } = useUser()
  return useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      const prefs = await getUserPreferences(user!.id) as UserPreferences
      if (prefs?.language) {
        localStorageUtils.setLanguage(prefs.language)
      }
      return prefs
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUpdateUserPreferences() {
  const queryClient = useQueryClient()
  const { data: user } = useUser()
  return useMutation({
    mutationFn: async (data: UpdateUserPreferencesInput) => {
      if (!user?.id) throw new Error('User not loaded')
      const prefs = await updateUserPreferencesApi(user.id, data) as UserPreferences
      if (prefs?.language) {
        localStorageUtils.setLanguage(prefs.language)
      }
      return prefs
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
      // Reload page to apply language change
      window.location.reload()
    },
  })
}

// Helper function to get language from localStorage (for initial load)
export function getLanguageFromStorage(): string {
  return localStorageUtils.getLanguage() || 'es'
}
