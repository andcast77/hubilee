import { createFileRoute } from '@tanstack/react-router'
import { AdminSettingsPage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/admin/settings')({
  component: AdminSettingsPage,
})
