import { userDisplayName } from '../core/auth.js'
import type { MemberResponse } from '../dto/company-members.dto.js'

type MemberRow = {
  id: string
  userId: string
  membershipRole: string
  createdAt: Date
  employeeCode?: string | null
  user: { email: string | null; firstName: string; lastName: string }
}

export function toMemberResponse(m: MemberRow, storeIds?: string[]): MemberResponse {
  const base: MemberResponse = {
    id: m.id,
    userId: m.userId,
    email: m.user.email,
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    name: userDisplayName(m.user),
    membershipRole: m.membershipRole,
    createdAt: m.createdAt,
    employeeCode: m.employeeCode ?? null,
  }
  if (m.membershipRole === 'USER' && storeIds !== undefined) {
    return { ...base, storeIds }
  }
  return base
}
