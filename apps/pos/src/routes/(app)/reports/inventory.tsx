import { createFileRoute } from '@tanstack/react-router'
import { ReportsInventoryPage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/reports/inventory')({
  component: ReportsInventoryPage,
})
