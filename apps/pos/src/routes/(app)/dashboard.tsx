import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/dashboard')({
  component: DashboardPage,
})
