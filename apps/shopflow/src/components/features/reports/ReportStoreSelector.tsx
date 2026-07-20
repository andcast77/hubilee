'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hubilee/ui'
import { useStoreContextOptional } from '@/components/providers/StoreContext'
import { useUser } from '@/hooks/useUser'
import { BarChart2 } from 'lucide-react'

const ALL_STORES_VALUE = '__all__'

export function ReportStoreSelector() {
  const storeContext = useStoreContextOptional()
  const { data: user } = useUser()
  const isStoreAdmin = user?.membershipRole === 'OWNER' || user?.membershipRole === 'ADMIN'

  if (!storeContext) return null

  const { stores, isLoading, reportStoreId, setReportStoreId, currentStoreId } = storeContext
  const value = reportStoreId ?? (isStoreAdmin ? ALL_STORES_VALUE : (currentStoreId ?? ''))

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BarChart2 className="h-4 w-4" />
        <span>Cargando locales...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <BarChart2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={value || currentStoreId || stores[0]?.id || ''}
        onValueChange={(v) => setReportStoreId(v === ALL_STORES_VALUE ? null : v || null)}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Seleccionar local de venta" />
        </SelectTrigger>
        <SelectContent>
          {isStoreAdmin && (
            <SelectItem value={ALL_STORES_VALUE}>
              Todos los locales de venta
            </SelectItem>
          )}
          {stores.filter((s) => s.active).map((store) => (
            <SelectItem key={store.id} value={store.id}>
              {store.name} ({store.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
