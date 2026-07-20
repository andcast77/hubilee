import { createFileRoute } from '@tanstack/react-router'
import { AdminSettingsPage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/admin/settings')({
  component: AdminSettingsPage,
})
