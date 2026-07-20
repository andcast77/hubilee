import { userDisplayName } from '../core/auth.js'
import type { AuthUserResponse, AuthCompanyResponse } from '../dto/auth.dto.js'
import type { CompanyRow } from '../core/auth-context.js'

export function toAuthUserResponse(
  user: { id: string; email: string; role: string; firstName: string; lastName: string; isSuperuser?: boolean },
  opts?: { companyId?: string }
): AuthUserResponse {
  const resp: AuthUserResponse = {
    id: user.id,
    email: user.email,
    name: userDisplayName(user),
    role: user.role,
    isSuperuser: user.isSuperuser ?? false,
  }
  if (opts?.companyId) resp.companyId = opts.companyId
  return resp
}

export function toAuthCompanyResponse(
  company: { id: string; name: string; modules?: { hr: boolean; pos: boolean; tech: boolean } }
): AuthCompanyResponse {
  return {
    id: company.id,
    name: company.name,
    modules: company.modules ?? { hr: false, pos: false, tech: false },
  }
}

export function companyRowToAuthCompany(row: CompanyRow): AuthCompanyResponse {
  return {
    id: row.id,
    name: row.name,
    modules: row.modules ?? { hr: false, pos: false, tech: false },
  }
}
