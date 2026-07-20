import { createFileRoute } from '@tanstack/react-router'
import { ReportsPage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/reports/')({
  component: ReportsPage,
})
