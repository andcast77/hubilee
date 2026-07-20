'use client'

import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/lib/api/client'
import { Module, Permission, type PermissionString, hasPermissionString } from '@/lib/permissions'
import type { UserRole } from '@/types'

type MeResponse =
  | { success: true; data: { id: string; email: string; name: string | null; role: string } }
  | { success: false; error?: string }
  | { user: { role: string } }

/**
 * Get current user from API (token sent via client from cookie). Returns only role for permissions.
 */
async function getCurrentUser(): Promise<{ role: UserRole }> {
  const response = await authApi.get<MeResponse>('/me')
  const user =
    response && typeof response === 'object' && 'data' in response && response.success && response.data
      ? response.data
      : response && typeof response === 'object' && 'user' in response
        ? (response as { user: { role: string } }).user
        : null
  if (!user) {
    throw new Error((response && typeof response === 'object' && 'error' in response ? (response as { error?: string }).error : undefined) || 'Failed to fetch user')
  }
  return { role: user.role as UserRole }
}

/**
 * Hook to check if current user has a specific permission
 */
export function usePermission(permissionString: PermissionString): boolean {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  if (!user) {
    return false
  }

  return hasPermissionString(user.role, permissionString)
}

/**
 * Hook to check if current user can access a module
 */
export function useModuleAccess(module: Module): boolean {
  return usePermission(`${module}:${Permission.VIEW}` as PermissionString)
}

/**
 * Hook to get current user role
 */
export function useUserRole(): UserRole | undefined {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return user?.role
}

/**
 * Hook to check multiple permissions at once
 */
export function usePermissions(permissionStrings: PermissionString[]): boolean {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  if (!user) {
    return false
  }

  // User has all permissions if they have all of them
  return permissionStrings.every((permission) =>
    hasPermissionString(user.role, permission)
  )
}

