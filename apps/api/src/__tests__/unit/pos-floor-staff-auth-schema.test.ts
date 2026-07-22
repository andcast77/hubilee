import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const schemaPath = path.join(apiRoot, 'prisma/schema.prisma')
const migrationsDir = path.join(apiRoot, 'prisma/migrations')

function readSchema(): string {
  return readFileSync(schemaPath, 'utf8')
}

function readAllMigrationSql(): string {
  return readdirSync(migrationsDir)
    .filter((name) => !name.startsWith('.') && name !== 'migration_lock.toml')
    .map((name) => {
      const sqlPath = path.join(migrationsDir, name, 'migration.sql')
      try {
        return readFileSync(sqlPath, 'utf8')
      } catch {
        return ''
      }
    })
    .join('\n')
}

function extractModelBlock(schema: string, modelName: string): string {
  const start = schema.indexOf(`model ${modelName} {`)
  expect(start, `model ${modelName} must exist`).toBeGreaterThanOrEqual(0)
  const after = schema.slice(start)
  const end = after.indexOf('\n}')
  expect(end, `model ${modelName} must close`).toBeGreaterThan(0)
  return after.slice(0, end)
}

describe('pos-floor-staff-auth schema (PR1)', () => {
  it('User.email is nullable and not a full-table @unique (partial unique in SQL)', () => {
    const user = extractModelBlock(readSchema(), 'User')
    expect(user).toMatch(/email\s+String\?/)
    expect(user).not.toMatch(/email\s+String\s+@unique/)
    expect(user).not.toMatch(/email\s+String\?\s+@unique/)
  })

  it('migration defines partial unique on users.email WHERE email IS NOT NULL', () => {
    const sql = readAllMigrationSql()
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX\s+"users_email_unique_not_null"\s+ON\s+"users"\s*\(\s*"email"\s*\)\s+WHERE\s+"email"\s+IS\s+NOT\s+NULL/i,
    )
  })

  it('Company.companyCode is required and unique in schema', () => {
    const company = extractModelBlock(readSchema(), 'Company')
    expect(company).toMatch(/companyCode\s+String\s+@unique/)
  })

  it('migration backfills companyCode for existing companies before NOT NULL', () => {
    const sql = readAllMigrationSql()
    expect(sql).toMatch(/ALTER TABLE\s+"companies"\s+ADD COLUMN\s+"companyCode"/i)
    expect(sql).toMatch(/UPDATE\s+"companies"\s+SET\s+"companyCode"/i)
    expect(sql).toMatch(
      /ALTER TABLE\s+"companies"\s+ALTER COLUMN\s+"companyCode"\s+SET NOT NULL/i,
    )
  })

  it('CompanyMember.employeeCode is nullable with unique(companyId, employeeCode)', () => {
    const member = extractModelBlock(readSchema(), 'CompanyMember')
    expect(member).toMatch(/employeeCode\s+String\?/)
    expect(member).toMatch(/@@unique\(\s*\[\s*companyId\s*,\s*employeeCode\s*\]\s*\)/)
  })

  it('migration defines partial unique one OPEN CashSession per openedByUserId', () => {
    const sql = readAllMigrationSql()
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX\s+"cash_sessions_one_open_opened_by"\s+ON\s+"cash_sessions"\s*\(\s*"openedByUserId"\s*\)\s+WHERE\s+"status"\s*=\s*'OPEN'/i,
    )
  })
})
