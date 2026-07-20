/**
 * Key rotation script for field-level encryption.
 *
 * Re-encrypts all encrypted fields (Employee.idNumber) from an old key to a new key
 * and recomputes HMAC search hashes with the new key.
 *
 * Usage:
 *   OLD_FIELD_KEY=<base64-old> NEW_FIELD_KEY=<base64-new> npx tsx scripts/rotate-field-key.ts
 *
 * Add --dry-run to preview changes without writing to the database.
 *
 * Generate a new key:
 *   openssl rand -base64 32
 *
 * Recommended process:
 *   1. Run with --dry-run to validate decryption with the old key.
 *   2. Run without --dry-run in a maintenance window on staging first.
 *   3. After confirming, run on production and update FIELD_ENCRYPTION_KEY in env vars.
 */

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'
import { prisma } from '@hubilee/database'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const SEPARATOR = ':'
const BATCH_SIZE = 100

const isDryRun = process.argv.includes('--dry-run')

function loadKey(envVar: string): Buffer {
  const raw = process.env[envVar]?.trim()
  if (!raw) throw new Error(`Missing required environment variable: ${envVar}`)
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== 32) {
    throw new Error(`${envVar} must be a base64-encoded 32-byte value (got ${buf.length} bytes)`)
  }
  return buf
}

function decryptField(stored: string, key: Buffer): string {
  const parts = stored.split(SEPARATOR)
  if (parts.length !== 3) throw new Error('Invalid encrypted field format')
  const [ivB64, tagB64, ciphertextB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')
  if (iv.length !== IV_LENGTH) throw new Error(`Invalid IV length: ${iv.length}`)
  if (tag.length !== TAG_LENGTH) throw new Error(`Invalid auth tag length: ${tag.length}`)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

function encryptField(value: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(SEPARATOR)
}

function hashForSearch(value: string, key: Buffer): string {
  return createHmac('sha256', key).update(value.toLowerCase()).digest('hex')
}

function isEncryptedFormat(value: string): boolean {
  const parts = value.split(SEPARATOR)
  return parts.length === 3
}

async function main() {
  const oldKey = loadKey('OLD_FIELD_KEY')
  const newKey = loadKey('NEW_FIELD_KEY')

  console.log(`Field-level encryption key rotation`)
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no DB writes)' : 'LIVE'}`)
  console.log()

  let cursor: string | undefined
  let totalProcessed = 0
  let totalRotated = 0
  let totalSkipped = 0
  let totalErrors = 0

  try {
    while (true) {
      const employees = await prisma.employee.findMany({
        take: BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        where: { idNumber: { not: null } },
        select: { id: true, companyId: true, idNumber: true },
        orderBy: { id: 'asc' },
      })

      if (employees.length === 0) break
      cursor = employees[employees.length - 1].id

      for (const emp of employees) {
        totalProcessed++
        const raw = emp.idNumber!

        if (!isEncryptedFormat(raw)) {
          console.warn(`  [SKIP] Employee ${emp.id}: idNumber appears to be plaintext (not encrypted with old key)`)
          totalSkipped++
          continue
        }

        let plaintext: string
        try {
          plaintext = decryptField(raw, oldKey)
        } catch (err) {
          console.error(`  [ERROR] Employee ${emp.id}: failed to decrypt with old key — ${(err as Error).message}`)
          totalErrors++
          continue
        }

        const newEncrypted = encryptField(plaintext, newKey)
        const newHash = hashForSearch(plaintext, newKey)

        if (!isDryRun) {
          await prisma.employee.update({
            where: { id: emp.id },
            data: { idNumber: newEncrypted, idNumberHash: newHash },
          })
        }

        totalRotated++
        if (isDryRun) {
          console.log(`  [DRY] Employee ${emp.id}: would re-encrypt idNumber`)
        }
      }

      console.log(`Processed batch of ${employees.length} — running total: ${totalProcessed}`)
    }
  } finally {
    await prisma.$disconnect?.()
  }

  console.log()
  console.log('=== Rotation Summary ===')
  console.log(`Total employees with idNumber : ${totalProcessed}`)
  console.log(`Rotated                       : ${totalRotated}`)
  console.log(`Skipped (plaintext/other)     : ${totalSkipped}`)
  console.log(`Errors                        : ${totalErrors}`)

  if (totalErrors > 0) {
    console.error('\nRotation completed with errors. Review the log above before swapping the active key.')
    process.exit(1)
  }

  if (!isDryRun) {
    console.log('\nRotation complete. Update FIELD_ENCRYPTION_KEY to NEW_FIELD_KEY in your environment and redeploy.')
  } else {
    console.log('\nDry run complete. No records were modified.')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
