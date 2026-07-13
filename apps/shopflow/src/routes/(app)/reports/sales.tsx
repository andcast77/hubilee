import { createFileRoute } from '@tanstack/react-router'
import { ReportsSalesPage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/reports/sales')({
  component: ReportsSalesPage,
})
