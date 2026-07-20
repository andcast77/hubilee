import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../db/index.js'
import { ForbiddenError, NotFoundError } from '../common/errors/app-error.js'

// ─── Export ─────────────────────────────────────────────────────────────────

export type MyDataExport = {
  exportedAt: string
  profile: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    phone: string | null
    role: string
    isActive: boolean
    privacyAcceptedAt: Date | null
    createdAt: Date
    updatedAt: Date
  }
  memberships: {
    companyId: string
    companyName: string
    membershipRole: string
    joinedAt: Date
  }[]
  preferences: {
    companyId: string
    language: string
  }[]
  auditLogs: {
    action: string
    entityType: string
    entityId: string | null
    ipAddress: string | null
    createdAt: Date
  }[]
  recentSales: {
    id: string
    companyId: string
    total: unknown
    status: string
    createdAt: Date
  }[]
  actionHistory: {
    action: string
    entityType: string
    entityId: string | null
    ipAddress: string | null
    createdAt: Date
  }[]
}

export async function exportMyData(userId: string): Promise<MyDataExport> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      privacyAcceptedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!user) throw new NotFoundError('Usuario no encontrado')

  const [memberships, preferences, auditLogs, recentSales, actionHistory] = await Promise.all([
    prisma.companyMember.findMany({
      where: { userId },
      select: {
        companyId: true,
        membershipRole: true,
        createdAt: true,
        company: { select: { name: true } },
      },
    }),
    prisma.userPreferences.findMany({
      where: { userId },
      select: { companyId: true, language: true },
    }),
    prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        action: true,
        entityType: true,
        entityId: true,
        ipAddress: true,
        createdAt: true,
      },
    }),
    prisma.sale.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: { id: true, companyId: true, total: true, status: true, createdAt: true },
    }),
    prisma.actionHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        action: true,
        entityType: true,
        entityId: true,
        ipAddress: true,
        createdAt: true,
      },
    }),
  ])

  return {
    exportedAt: new Date().toISOString(),
    profile: user,
    memberships: memberships.map((m) => ({
      companyId: m.companyId,
      companyName: m.company.name,
      membershipRole: m.membershipRole,
      joinedAt: m.createdAt,
    })),
    preferences,
    auditLogs,
    recentSales: recentSales.map((s) => ({ ...s, total: s.total })),
    actionHistory,
  }
}

// ─── Accept privacy ──────────────────────────────────────────────────────────

export async function acceptPrivacy(userId: string): Promise<{ privacyAcceptedAt: Date }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, privacyAcceptedAt: true },
  })
  if (!user) throw new NotFoundError('Usuario no encontrado')

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { privacyAcceptedAt: new Date() },
    select: { privacyAcceptedAt: true },
  })

  return { privacyAcceptedAt: updated.privacyAcceptedAt! }
}

// ─── Anonymize (right to erasure) ───────────────────────────────────────────

export type AnonymizeResult = { anonymized: true; message: string }

export async function anonymizeMyData(userId: string): Promise<AnonymizeResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true },
  })
  if (!user) throw new NotFoundError('Usuario no encontrado')

  // Guard: user must not be the sole active OWNER of any company.
  // If they are, the company would be left ownerless.
  const ownedCompanies = await prisma.companyMember.findMany({
    where: { userId, membershipRole: 'OWNER' },
    select: { companyId: true },
  })

  for (const { companyId } of ownedCompanies) {
    const otherOwners = await prisma.companyMember.count({
      where: { companyId, membershipRole: 'OWNER', userId: { not: userId } },
    })
    if (otherOwners === 0) {
      throw new ForbiddenError(
        'No puedes eliminar tu cuenta mientras seas el único propietario activo de una empresa. ' +
          'Transfiere la propiedad o elimina la empresa primero.',
        'SOLE_OWNER',
      )
    }
  }

  const anonymizedEmail = `deleted_${randomUUID()}@deleted.local`
  const invalidPasswordHash = await bcrypt.hash(randomUUID(), 10)

  await prisma.$transaction(async (tx) => {
    // Null out userId in loose AuditLog references (field is nullable)
    await tx.auditLog.updateMany({
      where: { userId },
      data: { userId: null },
    })

    // Anonymize PII fields; mark account inactive
    await tx.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        firstName: '[Eliminado]',
        lastName: '[Eliminado]',
        phone: null,
        isActive: false,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        verificationTokenHash: null,
        verificationTokenExpiry: null,
        passwordResetTokenHash: null,
        passwordResetTokenExpiry: null,
        posPreferredCompanyId: null,
        password: invalidPasswordHash,
      },
    })

    // Delete personal runtime data
    await tx.session.deleteMany({ where: { userId } })
    await tx.pushSubscription.deleteMany({ where: { userId } })
    await tx.notificationPreference.deleteMany({ where: { userId } })
  })

  return {
    anonymized: true,
    message:
      'Tus datos personales han sido anonimizados. La cuenta ha sido desactivada. ' +
      'Los registros contables y de auditoría se conservan sin vinculación a tu identidad.',
  }
}
