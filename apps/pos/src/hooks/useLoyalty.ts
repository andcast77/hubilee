import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CustomerPointsBalance } from '@/lib/services/loyaltyService'
import {
  getCustomerPointsBalance,
  getCustomerPointsHistory,
  getLoyaltyConfig,
  updateLoyaltyConfig as updateLoyaltyConfigApi,
  redeemPoints,
} from '@/lib/services/loyaltyService'

async function fetchCustomerPointsBalance(customerId: string): Promise<CustomerPointsBalance> {
  return getCustomerPointsBalance(customerId)
}

async function fetchCustomerPointsHistory(
  customerId: string,
  limit: number = 20,
  offset: number = 0
) {
  return getCustomerPointsHistory(customerId, limit, offset)
}

async function fetchLoyaltyConfig() {
  return getLoyaltyConfig()
}

async function redeemPointsForDiscount(
  customerId: string,
  pointsToRedeem: number,
  description?: string
): Promise<{ discountAmount: number; pointsUsed: number }> {
  return redeemPoints(customerId, pointsToRedeem, description)
}

async function updateLoyaltyConfig(data: {
  pointsPerDollar?: number
  redemptionRate?: number
  pointsExpireMonths?: number
  minPurchaseForPoints?: number
  maxPointsPerPurchase?: number
}) {
  return updateLoyaltyConfigApi(data)
}

export function useCustomerPoints(customerId: string | null) {
  return useQuery({
    queryKey: ['loyalty', 'balance', customerId],
    queryFn: () => fetchCustomerPointsBalance(customerId!),
    enabled: !!customerId,
  })
}

export function useCustomerPointsHistory(
  customerId: string | null,
  limit: number = 20,
  offset: number = 0
) {
  return useQuery({
    queryKey: ['loyalty', 'history', customerId, limit, offset],
    queryFn: () => fetchCustomerPointsHistory(customerId!, limit, offset),
    enabled: !!customerId,
  })
}

export function useLoyaltyConfig() {
  return useQuery({
    queryKey: ['loyalty', 'config'],
    queryFn: fetchLoyaltyConfig,
  })
}

export function useRedeemPoints() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      customerId,
      pointsToRedeem,
      description,
    }: {
      customerId: string
      pointsToRedeem: number
      description?: string
    }) => redeemPointsForDiscount(customerId, pointsToRedeem, description),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'balance', variables.customerId] })
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'history', variables.customerId] })
    },
  })
}

export function useUpdateLoyaltyConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateLoyaltyConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'config'] })
    },
  })
}

