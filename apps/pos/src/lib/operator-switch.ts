/** Pure helpers: cash close ≠ logout; operator switch requires closed cash. */

export type OperatorSwitchGateInput = {
  hasOpenCash: boolean
}

export type OperatorSwitchActionInput = {
  hasOpenCash: boolean
  /** True only after an explicit closeCashSession (not logout). */
  cashExplicitlyClosed: boolean
}

export type OperatorSwitchAction = 'block_close_cash' | 'allow_logout_then_login'

/** Product rule: logout must never auto-close an OPEN CashSession. */
export function logoutClosesCashSession(): boolean {
  return false
}

/** Switch (logout → next floor login) is blocked while the current operator has OPEN cash. */
export function canBeginOperatorSwitch(input: OperatorSwitchGateInput): boolean {
  return !input.hasOpenCash
}

export function operatorSwitchBlockMessage(input: OperatorSwitchGateInput): string | null {
  if (!input.hasOpenCash) return null
  return 'Debes cerrar la caja antes de cambiar de operador'
}

/**
 * Resolve the next UX step for operator switch.
 * Explicit close is required; logout alone never clears OPEN cash.
 */
export function resolveOperatorSwitchAction(input: OperatorSwitchActionInput): OperatorSwitchAction {
  if (input.hasOpenCash) return 'block_close_cash'
  return 'allow_logout_then_login'
}
