import { randomBytes } from 'node:crypto'
import { prisma } from '../db/index.js'
import { BadRequestError } from '../common/errors/app-error.js'

/**
 * Opaque unguessable company code for floor login (design: ~12–16 chars).
 * 8 random bytes → 16 hex chars.
 */
export function generateOpaqueCompanyCode(): string {
  return randomBytes(8).toString('hex')
}

const COMPANY_CODE_MAX_ATTEMPTS = 8

/** Allocate a unique opaque companyCode (retry on rare collision). */
export async function allocateUniqueCompanyCode(
  findExisting: (code: string) => Promise<{ id: string } | null> = (code) =>
    prisma.company.findFirst({ where: { companyCode: code }, select: { id: true } }),
): Promise<string> {
  for (let i = 0; i < COMPANY_CODE_MAX_ATTEMPTS; i++) {
    const code = generateOpaqueCompanyCode()
    const clash = await findExisting(code)
    if (!clash) return code
  }
  throw new BadRequestError('No se pudo generar un código de empresa único. Intenta de nuevo.')
}
