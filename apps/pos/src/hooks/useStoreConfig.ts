import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { StoreConfig } from '@/types'
import type { UpdateStoreConfigInput } from '@/lib/validations/storeConfig'
import { getStoreConfig, updateStoreConfig as updateStoreConfigApi } from '@/lib/services/storeConfigService'

async function fetchStoreConfig(): Promise<StoreConfig> {
  return getStoreConfig() as Promise<StoreConfig>
}

async function updateStoreConfig(data: UpdateStoreConfigInput): Promise<StoreConfig> {
  return updateStoreConfigApi(data) as Promise<StoreConfig>
}

export function useStoreConfig() {
  return useQuery({
    queryKey: ['store-config'],
    queryFn: fetchStoreConfig,
  })
}

export function useUpdateStoreConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateStoreConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-config'] })
    },
  })
}

