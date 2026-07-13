import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/dashboard')({
  component: DashboardPage,
})
