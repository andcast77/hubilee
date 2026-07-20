import { createFileRoute } from '@tanstack/react-router'
import { BackupPage } from '@/views/BackupPage'

export const Route = createFileRoute('/(app)/admin/backup')({
  component: BackupPage,
})
