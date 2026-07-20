const LANGUAGE_KEY = 'language'

export const localStorageUtils = {
  getLanguage: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(LANGUAGE_KEY)
  },

  setLanguage: (language: string): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem(LANGUAGE_KEY, language)
  },

  removeLanguage: (): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(LANGUAGE_KEY)
  },
}
