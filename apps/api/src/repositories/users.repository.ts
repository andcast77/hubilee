import { TenantScopedRepository } from '../common/database/index.js'

export const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

export type UserRow = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: 'USER' | 'ADMIN' | 'SUPERADMIN'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

type CreateUserInput = {
  email: string
  password: string
  firstName: string
  lastName: string
  role: 'USER' | 'ADMIN' | 'SUPERADMIN'
  isActive: boolean
}

export class UsersRepository extends TenantScopedRepository {
  async listActiveByCompany(): Promise<UserRow[]> {
    return this.db.user.findMany({
      where: {
        isActive: true,
        companyMemberships: {
          some: { companyId: this.tenantId },
        },
      },
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    }) as Promise<UserRow[]>
  }

  async findById(id: string): Promise<UserRow | null> {
    return this.db.user.findUnique({
      where: { id },
      select: USER_SELECT,
    }) as Promise<UserRow | null>
  }

  async findByEmail(email: string): Promise<{ id: string } | null> {
    return this.db.user.findFirst({
      where: { email },
      select: { id: true },
    })
  }

  async findIdentityById(id: string): Promise<{ id: string; email: string | null } | null> {
    return this.db.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    })
  }

  async createWithCompanyMembership(input: CreateUserInput): Promise<UserRow> {
    const { allocateUniqueUserCode } = await import('../services/user-code.js')
    const userCode = await allocateUniqueUserCode()
    return this.db.user.create({
      data: {
        email: input.email,
        userCode,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        isActive: input.isActive,
        companyMemberships: {
          create: {
            companyId: this.tenantId,
            membershipRole: 'USER',
          },
        },
      },
      select: USER_SELECT,
    }) as Promise<UserRow>
  }

  async updateById(id: string, data: Record<string, unknown>): Promise<UserRow> {
    return this.db.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    }) as Promise<UserRow>
  }

  async deleteById(id: string): Promise<void> {
    await this.db.user.delete({ where: { id } })
  }
}
