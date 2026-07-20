import 'server-only'

import { serverAuthGetData } from '@/lib/api/server'
import type { MeResponse } from '@hubilee/contracts'

export async function getSessionUserId(): Promise<string | null> {
  const me = await serverAuthGetData<MeResponse>('/me')
  return me?.id ?? null
}

export async function getSessionUser(): Promise<MeResponse | null> {
  return serverAuthGetData<MeResponse>('/me')
}
