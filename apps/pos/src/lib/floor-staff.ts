/** Pure helpers for floor staff codes display and admin reset/attach payloads. */

export type FloorCodesInput = {
  companyCode: string
  employeeCode: string
}

export type FloorCodesDisplay = {
  companyCode: string
  employeeCode: string
  /** Combined string suitable for clipboard copy. */
  copyText: string
}

export function formatFloorCodesForDisplay(codes: FloorCodesInput): FloorCodesDisplay {
  return {
    companyCode: codes.companyCode,
    employeeCode: codes.employeeCode,
    copyText: `Empresa: ${codes.companyCode}\nEmpleado: ${codes.employeeCode}`,
  }
}

export function memberHasFloorCodes(member: {
  employeeCode?: string | null
  email?: string | null
}): boolean {
  return Boolean(member.employeeCode && String(member.employeeCode).trim())
}

export function buildResetFloorPasswordPayload(input: { password: string }): {
  password: string
} {
  return { password: input.password }
}

export function buildAttachFloorEmailPayload(input: { email: string }): {
  email: string
} {
  return { email: input.email.trim() }
}
