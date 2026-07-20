import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { TicketConfig } from '@/types'
import type { UpdateTicketConfigInput } from '@/lib/validations/ticketConfig'
import {
  getTicketConfig as fetchTicketConfig,
  updateTicketConfig,
} from '@/lib/services/ticketConfigService'

export function useTicketConfig(storeId?: string) {
  return useQuery({
    queryKey: ['ticket-config', storeId],
    queryFn: () => fetchTicketConfig(storeId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUpdateTicketConfig(storeId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateTicketConfigInput) =>
      updateTicketConfig(data, storeId) as Promise<TicketConfig>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-config', storeId] })
    },
  })
}
