import { z } from 'zod'
import { UserRole } from '@/types'

export const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.nativeEnum(UserRole),
  active: z.boolean(),
  storeIds: z.array(z.string()).optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  role: z.nativeEnum(UserRole).optional(),
  active: z.boolean().optional(),
  storeIds: z.array(z.string()).optional(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

export const userQuerySchema = z.object({
  search: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  active: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

export type UserQueryInput = z.infer<typeof userQuerySchema>

