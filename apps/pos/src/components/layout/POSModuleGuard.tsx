'use client'

import { useUser } from '@/hooks/useUser'

const hubSettingsUrl =
  process.env.NEXT_PUBLIC_HUB_URL || "http://localhost:3001"

export function PosModuleGuard({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUser()

  if (isLoading || !user) return <>{children}</>
  if (user.isSuperuser) return <>{children}</>
  if (!user.companyId) return <>{children}</>
  if (user.company?.modules?.pos !== false) return <>{children}</>

  const isOwnerOrAdmin =
    user.membershipRole === 'OWNER' || user.membershipRole === 'ADMIN'

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-amber-50">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-semibold text-amber-900 mb-2">Módulo no activo</h1>
        <p className="text-amber-800">
          El módulo Pos no está activado para esta empresa.
          {isOwnerOrAdmin
            ? ' Puedes activarlo desde la configuración de la empresa en el Hub.'
            : ' Pídele a un propietario o administrador que lo active en el Hub.'}
        </p>
        {isOwnerOrAdmin ? (
          <a
            href={`${hubSettingsUrl.replace(/\/$/, '')}/dashboard/settings`}
            className="inline-flex text-sm font-medium text-indigo-700 underline hover:text-indigo-900"
          >
            Abrir configuración en el Hub
          </a>
        ) : null}
      </div>
    </div>
  )
}
