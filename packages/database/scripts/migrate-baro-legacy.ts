/**
 * Migrates data from a standalone baro Postgres database into multisystem schema.
 *
 * Usage:
 *   BARO_LEGACY_DATABASE_URL=postgresql://baro:baro@localhost:5433/baro \
 *   DATABASE_URL=postgresql://multisystem:multisystem@localhost:5432/multisystem \
 *   pnpm exec tsx packages/database/scripts/migrate-baro-legacy.ts [--dry-run]
 *
 * Requires baro tables in legacy DB (User, Professional, Expediente, …) and
 * baro_* tables already created in multisystem via Prisma migrate.
 */
import 'dotenv/config'
import pg from 'pg'

const dryRun = process.argv.includes('--dry-run')

const legacyUrl = process.env.BARO_LEGACY_DATABASE_URL
const targetUrl = process.env.DATABASE_URL

if (!legacyUrl || !targetUrl) {
  console.error('Set BARO_LEGACY_DATABASE_URL and DATABASE_URL')
  process.exit(1)
}

type LegacyUser = {
  id: string
  email: string
  passwordHash: string
  titularProfessionalId: string | null
}

async function main() {
  const legacy = new pg.Client({ connectionString: legacyUrl })
  const target = new pg.Client({ connectionString: targetUrl })
  await legacy.connect()
  await target.connect()

  try {
    const { rows: users } = await legacy.query<LegacyUser>(
      'SELECT id, email, "passwordHash", "titularProfessionalId" FROM "User" ORDER BY "createdAt"'
    )
    console.log(`Found ${users.length} legacy baro user(s)${dryRun ? ' (dry-run)' : ''}`)

    for (const lu of users) {
      const existing = await target.query('SELECT id FROM users WHERE email = $1', [lu.email])
      if (existing.rowCount && existing.rowCount > 0) {
        console.log(`Skip ${lu.email}: already in multisystem`)
        continue
      }

      const titular = lu.titularProfessionalId
        ? (
            await legacy.query<{ displayName: string }>(
              'SELECT "displayName" FROM "Professional" WHERE id = $1',
              [lu.titularProfessionalId]
            )
          ).rows[0]
        : null
      const companyName = titular?.displayName?.trim() || `Estudio ${lu.email.split('@')[0]}`

      if (dryRun) {
        console.log(`Would migrate ${lu.email} → company "${companyName}"`)
        continue
      }

      await target.query('BEGIN')
      try {
        const userRes = await target.query<{ id: string }>(
          `INSERT INTO users (id, email, password, "firstName", "lastName", role, "isActive", "emailVerified", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, '', 'USER', true, true, NOW(), NOW())
           RETURNING id`,
          [lu.email, lu.passwordHash, companyName.slice(0, 80)]
        )
        const userId = userRes.rows[0]!.id

        const companyRes = await target.query<{ id: string }>(
          `INSERT INTO companies (id, name, "ownerUserId", "isActive", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, true, NOW(), NOW())
           RETURNING id`,
          [`${companyName} (${lu.email})`, userId]
        )
        const companyId = companyRes.rows[0]!.id

        await target.query(
          `INSERT INTO company_members (id, "userId", "companyId", "membershipRole", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, 'OWNER', NOW(), NOW())`,
          [userId, companyId]
        )

        const baroMod = await target.query<{ id: string }>(`SELECT id FROM modules WHERE key = 'baro'`)
        if (baroMod.rowCount) {
          await target.query(
            `INSERT INTO company_modules (id, "companyId", "moduleId", enabled, "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, true, NOW(), NOW())
             ON CONFLICT DO NOTHING`,
            [companyId, baroMod.rows[0]!.id]
          )
        }

        // TODO: copy Professional / Expediente graph with companyId mapping (legacy id → new uuid)
        console.log(`Migrated user ${lu.email} → company ${companyId} (domain data: run follow-up script)`)
        await target.query('COMMIT')
      } catch (e) {
        await target.query('ROLLBACK')
        throw e
      }
    }
  } finally {
    await legacy.end()
    await target.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
