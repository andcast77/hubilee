/** Pure helpers for shop userCode display and admin reset/attach payloads. */

export type UserCodeDisplay = {
  userCode: string
  copyText: string
}

export function formatUserCodeForDisplay(userCode: string): UserCodeDisplay {
  const code = userCode.trim()
  return {
    userCode: code,
    copyText: `Código de usuario: ${code}`,
  }
}

/** True when the member has a login userCode (ignores legacy employeeCode). */
export function memberHasUserCode(member: {
  userCode?: string | null
  employeeCode?: string | null
  email?: string | null
}): boolean {
  return Boolean(member.userCode && String(member.userCode).trim())
}

export function buildResetShopUserPasswordPayload(input: { password: string }): {
  password: string
} {
  return { password: input.password }
}

export function buildAttachShopUserEmailPayload(input: { email: string }): {
  email: string
} {
  return { email: input.email.trim() }
}

/** @deprecated Prefer formatUserCodeForDisplay */
export function formatFloorCodesForDisplay(codes: {
  companyCode?: string
  employeeCode?: string
  userCode?: string
}): { companyCode: string; employeeCode: string; copyText: string } {
  const userCode = (codes.userCode ?? '').trim()
  return {
    companyCode: codes.companyCode ?? '',
    employeeCode: userCode,
    copyText: formatUserCodeForDisplay(userCode).copyText,
  }
}

/** @deprecated Prefer memberHasUserCode */
export function memberHasFloorCodes(member: {
  userCode?: string | null
  employeeCode?: string | null
  email?: string | null
}): boolean {
  return memberHasUserCode(member)
}

/** @deprecated Prefer buildResetShopUserPasswordPayload */
export function buildResetFloorPasswordPayload(input: { password: string }): {
  password: string
} {
  return buildResetShopUserPasswordPayload(input)
}

/** @deprecated Prefer buildAttachShopUserEmailPayload */
export function buildAttachFloorEmailPayload(input: { email: string }): {
  email: string
} {
  return buildAttachShopUserEmailPayload(input)
}
