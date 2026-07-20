import { posApi } from '@/lib/api/client'
import type { ActionType, EntityType } from '@/types'

export interface LogActionInput {
  userId: string
  action: ActionType
  entityType: EntityType
  entityId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export interface ActionHistoryQuery {
  userId?: string
  action?: ActionType
  entityType?: EntityType
  entityId?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

/**
 * Log a user action to the action history
 */
export async function logAction(input: LogActionInput): Promise<void> {
  await posApi.post('/action-history', {
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    details: input.details,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  })
}

/**
 * Get action history with filters
 */
export async function getActionHistory(query: ActionHistoryQuery = {}) {
  const {
    userId,
    action,
    entityType,
    entityId,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = query

  const params = new URLSearchParams()
  if (userId) params.append('userId', userId)
  if (action) params.append('action', action)
  if (entityType) params.append('entityType', entityType)
  if (entityId) params.append('entityId', entityId)
  if (startDate) params.append('startDate', startDate.toISOString())
  if (endDate) params.append('endDate', endDate.toISOString())
  params.append('page', page.toString())
  params.append('limit', limit.toString())

  const response = await posApi.get<{
    success: boolean
    data?: {
      actions: Array<{
        id: string
        userId: string
        action: string
        entityType: string
        entityId: string | null
        details: Record<string, unknown> | null
        ipAddress: string | null
        userAgent: string | null
        createdAt: Date
        user: {
          id: string
          name: string | null
          email: string
          role: string
        }
      }>
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }
    error?: string
  }>(`/action-history?${params.toString()}`)

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Error al obtener historial de acciones')
  }

  return response.data
}

/**
 * Get action history for a specific user
 */
export async function getUserActionHistory(
  userId: string,
  query: Omit<ActionHistoryQuery, 'userId'> = {}
) {
  return getActionHistory({ ...query, userId })
}

/**
 * Get actions for a specific entity
 */
export async function getEntityActionHistory(
  entityType: EntityType,
  entityId: string,
  query: Omit<ActionHistoryQuery, 'entityType' | 'entityId'> = {}
) {
  return getActionHistory({ ...query, entityType, entityId })
}

