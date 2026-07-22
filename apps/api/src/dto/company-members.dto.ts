import { z } from 'zod'

/** Response: member in list (with optional storeIds for USER role) */
export type MemberResponse = {
  id: string
  userId: string
  email: string | null
  firstName: string
  lastName: string
  name: string
  membershipRole: string
  createdAt: Date
  storeIds?: string[]
  /** Present for floor USER members with codes login */
  employeeCode?: string | null
}

/** Input: create member (user + add to company). Email optional for floor USER. */
export const createMemberBodySchema = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(1),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    membershipRole: z.enum(['ADMIN', 'USER']),
    storeIds: z.array(z.string().uuid()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.membershipRole === 'ADMIN' && !data.email?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El email es obligatorio para administradores',
        path: ['email'],
      })
    }
  })

export type CreateMemberBody = z.infer<typeof createMemberBodySchema>

/** Input: update member stores (USER only) */
export const updateMemberStoresBodySchema = z.object({
  storeIds: z.array(z.string().uuid()),
})

export type UpdateMemberStoresBody = z.infer<typeof updateMemberStoresBodySchema>

/** Admin/owner resets a floor member password */
export const resetMemberPasswordBodySchema = z.object({
  password: z.string().min(1),
})

export type ResetMemberPasswordBody = z.infer<typeof resetMemberPasswordBodySchema>

/** Admin/owner attaches email to a codes-only floor user (enables email login; codes remain). */
export const attachMemberEmailBodySchema = z.object({
  email: z.string().email(),
})

export type AttachMemberEmailBody = z.infer<typeof attachMemberEmailBodySchema>
