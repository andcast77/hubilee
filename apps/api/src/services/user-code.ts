import { randomInt } from 'node:crypto'
import { prisma } from '../db/index.js'
import { BadRequestError } from '../common/errors/app-error.js'

/** 8-digit globally unique user code (easy to type on POS keypad). */
export function generateUserCode(): string {
  return String(randomInt(0, 100_000_000)).padStart(8, '0')
}

/** @deprecated Use generateUserCode */
export const generateLoginCode = generateUserCode

const USER_CODE_MAX_ATTEMPTS = 24

/** Allocate a unique User.userCode (retry on rare collision). */
export async function allocateUniqueUserCode(
  findExisting: (code: string) => Promise<{ id: string } | null> = (code) =>
    prisma.user.findFirst({ where: { userCode: code }, select: { id: true } }),
): Promise<string> {
  for (let i = 0; i < USER_CODE_MAX_ATTEMPTS; i++) {
    const code = generateUserCode()
    const clash = await findExisting(code)
    if (!clash) return code
  }
  throw new BadRequestError('No se pudo generar un código de usuario único. Intenta de nuevo.')
}

/** @deprecated Use allocateUniqueUserCode */
export const allocateUniqueLoginCode = allocateUniqueUserCode
