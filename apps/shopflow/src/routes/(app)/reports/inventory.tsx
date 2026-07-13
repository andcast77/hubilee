import { createFileRoute } from '@tanstack/react-router'
import { ReportsInventoryPage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/reports/inventory')({
  component: ReportsInventoryPage,
})
