import { getCompanyModules } from '../core/modules.js'
import type { CompanyResponse, CompanyStatsResponse } from '../dto/companies.dto.js'

type CompanyWithOwner = {
  id: string
  name: string
  parentId: string | null
  ownerUserId: string | null
  isActive: boolean
  logo: string | null
  taxId: string | null
  address: string | null
  phone: string | null
  createdAt: Date
  updatedAt: Date
  owner: { email: string | null; firstName: string; lastName: string } | null
}

export async function toCompanyResponse(company: CompanyWithOwner): Promise<CompanyResponse> {
  const modules = await getCompanyModules(company.id)
  const ownerName = company.owner
    ? `${company.owner.firstName || ''} ${company.owner.lastName || ''}`.trim() || company.owner.email || ''
    : ''
  return {
    id: company.id,
    name: company.name,
    parentId: company.parentId,
    ownerUserId: company.ownerUserId,
    owner: company.ownerUserId
      ? {
          id: company.ownerUserId,
          email: company.owner?.email ?? null,
          firstName: company.owner?.firstName ?? '',
          lastName: company.owner?.lastName ?? '',
          name: ownerName,
        }
      : null,
    modules,
    isActive: company.isActive,
    logo: company.logo,
    taxId: company.taxId,
    address: company.address,
    phone: company.phone,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  }
}

export function toCompanyStatsLastMember(
  lastMember: {
    userId: string
    user: { email: string | null; firstName: string; lastName: string }
    membershipRole: string
    createdAt: Date
  } | null,
): CompanyStatsResponse['lastMember'] {
  if (!lastMember) return null
  const u = lastMember.user
  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || ''
  return {
    userId: lastMember.userId,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    name,
    membershipRole: lastMember.membershipRole,
    createdAt: lastMember.createdAt,
  }
}
