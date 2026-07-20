'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hubilee/ui'
import { useStoreContext } from '@/components/providers/StoreContext'
import { Store } from 'lucide-react'

export function StoreSelector() {
  const { stores, isLoading, currentStoreId, setCurrentStoreId } = useStoreContext()

  if (isLoading || stores.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Store className="h-4 w-4" />
        <span>{isLoading ? 'Cargando locales...' : 'Sin locales'}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentStoreId ?? ''}
        onValueChange={(v) => setCurrentStoreId(v || null)}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Selecciona un local" />
        </SelectTrigger>
        <SelectContent>
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
