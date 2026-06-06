'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/** Antes el registro vivía en Cuenta con #profesionales; redirige a /profesionales. */
export function CuentaLegacyHashRedirect() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (pathname !== '/cuenta') return
    const first = window.location.hash.replace(/^#/, '').split('#')[0] ?? ''
    if (first === 'profesionales') {
      router.replace('/profesionales')
    }
  }, [pathname, router])

  return null
}
