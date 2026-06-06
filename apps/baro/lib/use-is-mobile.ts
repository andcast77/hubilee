'use client'

import { useSyncExternalStore } from 'react'

function getMobileSnapshot(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 639px)').matches
}

function subscribe(cb: () => void) {
  const mql = window.matchMedia('(max-width: 639px)')
  mql.addEventListener('change', cb)
  return () => mql.removeEventListener('change', cb)
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getMobileSnapshot, () => false)
}
