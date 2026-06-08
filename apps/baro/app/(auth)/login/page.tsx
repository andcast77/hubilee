import { Suspense } from 'react'
import { LoginPage } from '@/views/LoginPage'

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-white/60">
      Cargando…
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPage />
    </Suspense>
  )
}
