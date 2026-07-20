import { posApi } from '@/lib/api/client'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import { LoyaltyPointType } from '@/types'

export interface LoyaltyConfigData {
  pointsPerDollar: number
  redemptionRate: number
  pointsExpireMonths?: number
  minPurchaseForPoints: number
  maxPointsPerPurchase?: number
}

export interface CustomerPointsBalance {
  customerId: string
  customerName: string
  totalPoints: number
  availablePoints: number
  expiringSoon: number // Points expiring in next 30 days
  lastActivity: Date | null
}

export interface PointsTransaction {
  customerId: string
  points: number
  type: LoyaltyPointType
  description?: string
  saleId?: string
  expiresAt?: Date
}

/**
 * Get current loyalty configuration
 */
export async function getLoyaltyConfig(): Promise<LoyaltyConfigData> {
  const response = await posApi.get<{ success: boolean; data: LoyaltyConfigData }>(
    '/loyalty/config'
  )

  if (!response.success) {
    // Return default config if error
    return {
      pointsPerDollar: 1.0,
      redemptionRate: 0.01,
      pointsExpireMonths: undefined,
      minPurchaseForPoints: 0,
      maxPointsPerPurchase: undefined,
    }
  }

  return response.data
}

/**
 * Update loyalty configuration
 */
export async function updateLoyaltyConfig(data: Partial<LoyaltyConfigData>): Promise<LoyaltyConfigData> {
  const response = await posApi.put<{ success: boolean; data: LoyaltyConfigData; error?: string }>(
    '/loyalty/config',
    data
  )

  if (!response.success) {
    throw new ApiError(400, response.error || 'Error al actualizar configuración de lealtad', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

/**
 * Get customer's current points balance
 */
export async function getCustomerPointsBalance(customerId: string): Promise<CustomerPointsBalance> {
  const response = await posApi.get<{ success: boolean; data: CustomerPointsBalance; error?: string }>(
    `/loyalty/points/${customerId}`
  )

  if (!response.success) {
    if (response.error?.includes('no encontrado')) {
      throw new ApiError(404, 'Customer not found', ErrorCodes.NOT_FOUND)
    }
    throw new ApiError(500, response.error || 'Error al obtener balance de puntos', ErrorCodes.INTERNAL_ERROR)
  }

  return response.data
}

/**
 * Award points to customer for a purchase
 */
export async function awardPointsForPurchase(
  customerId: string,
  purchaseAmount: number,
  saleId: string
): Promise<number> {
  const response = await posApi.post<{ success: boolean; data: { pointsAwarded: number }; error?: string }>(
    '/loyalty/points/award',
    {
      customerId,
      purchaseAmount,
      saleId,
    }
  )

  if (!response.success) {
    console.error('Failed to award loyalty points:', response.error)
    return 0 // Don't throw, just return 0 points
  }

  return response.data.pointsAwarded
}

/**
 * Redeem points for discount
 */
export async function redeemPoints(
  customerId: string,
  pointsToRedeem: number,
  _description?: string
): Promise<{ discountAmount: number; pointsUsed: number }> {
  const config = await getLoyaltyConfig()
  const balance = await getCustomerPointsBalance(customerId)

  if (balance.availablePoints < pointsToRedeem) {
    throw new ApiError(
      400,
      `Insufficient points. Available: ${balance.availablePoints}, Requested: ${pointsToRedeem}`,
      ErrorCodes.VALIDATION_ERROR
    )
  }

  // Calculate discount amount
  const discountAmount = pointsToRedeem * config.redemptionRate

  // Note: This would need a redeem endpoint in the API
  // For now, we'll calculate and return the discount
  // The actual redemption transaction should be created when the sale is created

  return {
    discountAmount,
    pointsUsed: pointsToRedeem,
  }
}

/**
 * Get points history for a customer
 */
export async function getCustomerPointsHistory(
  _customerId: string,
  limit: number = 50,
  offset: number = 0
) {
  // Note: This endpoint would need to be added to the API
  // For now, return empty result
  return {
    transactions: [],
    pagination: {
      total: 0,
      limit,
      offset,
      hasMore: false,
    },
  }
}

/**
 * Expire old points (should be run periodically)
 */
export async function expireOldPoints(): Promise<number> {
  // Note: This would be a background job endpoint in the API
  // For now, return 0
  return 0
}
