/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_HUB_URL: string
  readonly VITE_POS_URL: string
  readonly VITE_TECHSERVICES_URL: string
  readonly VITE_TURNSTILE_SITE_KEY: string
  readonly VITE_VAPID_PUBLIC_KEY: string
  readonly VITE_WORKIFY_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
