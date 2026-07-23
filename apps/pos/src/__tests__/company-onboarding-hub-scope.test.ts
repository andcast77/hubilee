/**
 * Non-goal guard: company-onboarding-wizard first slice must not touch Hub UI.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

describe('company-onboarding-wizard scope — Hub untouched', () => {
  it('has no dirty apps/hub paths in the working tree for this change', () => {
    const status = execSync('git status --porcelain -- apps/hub', {
      encoding: 'utf8',
      cwd: repoRoot,
    }).trim()
    expect(status).toBe('')
  })
})
