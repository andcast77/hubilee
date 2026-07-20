import { createFileRoute } from '@tanstack/react-router'
import { ReportsSalesPage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/reports/sales')({
  component: ReportsSalesPage,
})
