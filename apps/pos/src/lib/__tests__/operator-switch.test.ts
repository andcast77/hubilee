/**
 * PR5 / Phase 5 — operator switch gate (Strict TDD RED).
 * Spec: pos-operator-switch — switch blocked while OPEN; allowed after explicit close.
 */
import { describe, expect, it } from 'vitest'
import {
  canBeginOperatorSwitch,
  logoutClosesCashSession,
  operatorSwitchBlockMessage,
  resolveOperatorSwitchAction,
} from '@/lib/operator-switch'

describe('operator switch vs cash', () => {
  it('logout does not auto-close cash', () => {
    expect(logoutClosesCashSession()).toBe(false)
  })

  it('blocks switch while cash is OPEN', () => {
    expect(canBeginOperatorSwitch({ hasOpenCash: true })).toBe(false)
    expect(operatorSwitchBlockMessage({ hasOpenCash: true })).toMatch(/cerrar la caja/i)
    expect(resolveOperatorSwitchAction({ hasOpenCash: true, cashExplicitlyClosed: false })).toBe(
      'block_close_cash',
    )
  })

  it('allows switch after explicit close (no OPEN cash)', () => {
    expect(canBeginOperatorSwitch({ hasOpenCash: false })).toBe(true)
    expect(operatorSwitchBlockMessage({ hasOpenCash: false })).toBeNull()
    expect(resolveOperatorSwitchAction({ hasOpenCash: false, cashExplicitlyClosed: true })).toBe(
      'allow_logout_then_login',
    )
  })

  it('explicit close flag alone is not enough if OPEN still present', () => {
    expect(
      resolveOperatorSwitchAction({ hasOpenCash: true, cashExplicitlyClosed: true }),
    ).toBe('block_close_cash')
  })
})
