/**
 * Centralized `VITE_*` env accessor for the Vite build of Pos.
 *
 * Mirrors the `NEXT_PUBLIC_*` contract the (still-present) Next.js app reads
 * directly from `process.env`. Route/component migration to consume this
 * module instead of `process.env.NEXT_PUBLIC_*` happens in PR3 (route-tree
 * migration) — this slice only adds the accessor, it does not rewire
 * existing Next.js consumers.
 */
function readEnv(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key]
  return typeof value === 'string' ? value : ''
}

export const env = {
  get apiUrl() {
    return readEnv('VITE_API_URL')
  },
  get hubUrl() {
    return readEnv('VITE_HUB_URL')
  },
  get posUrl() {
    return readEnv('VITE_POS_URL')
  },
  get techservicesUrl() {
    return readEnv('VITE_TECHSERVICES_URL')
  },
  get turnstileSiteKey() {
    return readEnv('VITE_TURNSTILE_SITE_KEY')
  },
  get vapidPublicKey() {
    return readEnv('VITE_VAPID_PUBLIC_KEY')
  },
  get hrUrl() {
    return readEnv('VITE_HR_URL')
  },
} as const
