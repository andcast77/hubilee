import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@/types'
import type { CreateUserInput, UpdateUserInput, UserQueryInput } from '@/lib/validations/user'
import {
  getUsers,
  getCompanyMembers,
  createCompanyMember,
  getUserById,
  createUser as createUserApi,
  updateUser as updateUserApi,
  deleteUser as deleteUserApi,
  updateMemberStores,
} from '@/lib/services/userService'

async function fetchUsers(query?: UserQueryInput): Promise<{ users: User[]; pagination: any }> {
  return getUsers(query ?? { page: 1, limit: 20 })
}

async function fetchUser(id: string): Promise<User> {
  return getUserById(id)
}

async function createUser(data: CreateUserInput): Promise<User> {
  return createUserApi(data)
}

async function updateUser(id: string, data: UpdateUserInput): Promise<User> {
  return updateUserApi(id, data)
}

async function deleteUser(id: string): Promise<void> {
  await deleteUserApi(id)
}

export function useUsers(query?: UserQueryInput) {
  return useQuery({
    queryKey: ['users', query],
    queryFn: () => fetchUsers(query),
  })
}

/** Usuarios de la empresa (misma lista en Workify y Pos). Usar cuando tengas companyId. */
export function useCompanyMembers(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ['companyMembers', companyId],
    queryFn: () => getCompanyMembers(companyId!),
    enabled: !!companyId,
  })
}

export function useCreateCompanyMember(companyId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      email: string
      password: string
      firstName?: string
      lastName?: string
      membershipRole: 'ADMIN' | 'USER'
      storeIds?: string[]
    }) => createCompanyMember(companyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyMembers', companyId] })
    },
  })
}

export function useUpdateMemberStores(companyId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, storeIds }: { userId: string; storeIds: string[] }) =>
      updateMemberStores(companyId!, userId, storeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyMembers', companyId] })
    },
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => fetchUser(id),
    enabled: !!id,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) => updateUser(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', data.id] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
