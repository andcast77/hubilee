/**
 * Client-side backup API service.
 * All calls go to the external API (NEXT_PUBLIC_API_URL as primary), not Next.js routes.
 */
import { posApi } from '@/lib/api/client'

export interface BackupItem {
  id: string
  filename: string
  createdAt: Date
  size: number
  type: 'database' | 'data_export'
  format: 'sql' | 'json' | 'csv'
}

export async function getBackupList(): Promise<BackupItem[]> {
  const response = await posApi.get<{
    success?: boolean
    data?: BackupItem[]
    backups?: BackupItem[]
    error?: string
  }>('/backup/list')
  const r = response as { success?: boolean; data?: BackupItem[]; backups?: BackupItem[]; error?: string }
  if (r.success === false && r.error) {
    throw new Error(r.error)
  }
  return r.data ?? r.backups ?? []
}

export async function createBackup(): Promise<BackupItem> {
  const response = await posApi.post<{ success?: boolean; data?: BackupItem; error?: string }>(
    '/backup/create',
    {}
  )
  const r = response as { success?: boolean; data?: BackupItem; error?: string }
  if (r.success === false && r.error) {
    throw new Error(r.error)
  }
  if (!r.data) throw new Error('Error al crear respaldo')
  return r.data
}

export async function restoreBackup(filename: string): Promise<void> {
  const response = await posApi.post<{ success?: boolean; error?: string }>('/backup/restore', {
    filename,
  })
  const r = response as { success?: boolean; error?: string }
  if (r.success === false && r.error) {
    throw new Error(r.error)
  }
}

export async function deleteBackup(filename: string): Promise<void> {
  const response = await posApi.delete<{ success?: boolean; error?: string }>(
    '/backup/delete',
    { filename }
  )
  const r = response as { success?: boolean; error?: string }
  if (r.success === false && r.error) {
    throw new Error(r.error)
  }
}

/** URL to download a backup file (external API). Requires auth via cookie or token. */
export function getBackupDownloadUrl(filename: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? ""
  if (!base) return ''
  return `${base.replace(/\/$/, '')}/v1/pos/backup/download/${encodeURIComponent(filename)}`
}
