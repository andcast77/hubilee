import { z } from 'zod'

const SUPPORTED_LANGUAGES = ['es', 'en'] as const

export const updateUserPreferencesSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES).refine((val) => SUPPORTED_LANGUAGES.includes(val), {
    message: 'Language must be es or en',
  }),
})

export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesSchema>

export const SUPPORTED_LANGUAGES_LIST = SUPPORTED_LANGUAGES
