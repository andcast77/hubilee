import { createFileRoute } from '@tanstack/react-router'
import { ReportsPage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/reports/')({
  component: ReportsPage,
})
