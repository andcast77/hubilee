'use client'

import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useUserPreferences'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hubilee/ui'
import { Label } from '@hubilee/ui'
import { SUPPORTED_LANGUAGES_LIST } from '@/lib/validations/userPreferences'

const LANGUAGE_LABELS: Record<string, string> = {
  es: 'Español',
  en: 'English',
}

export function LanguageSelector() {
  const { data: preferences, isLoading } = useUserPreferences()
  const updatePreferences = useUpdateUserPreferences()

  const handleLanguageChange = (language: string) => {
    updatePreferences.mutate({ language: language as 'es' | 'en' })
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Idioma</Label>
        <div className="h-10 w-full bg-gray-100 animate-pulse rounded-md" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="language">Idioma</Label>
      <Select
        value={preferences?.language || 'es'}
        onValueChange={handleLanguageChange}
        disabled={updatePreferences.isPending}
      >
        <SelectTrigger id="language">
          <SelectValue placeholder="Seleccionar idioma" />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES_LIST.map((lang) => (
            <SelectItem key={lang} value={lang}>
              {LANGUAGE_LABELS[lang] || lang}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {updatePreferences.isPending && (
        <p className="text-xs text-gray-500">Actualizando idioma...</p>
      )}
    </div>
  )
}
