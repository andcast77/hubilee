import { createFileRoute } from '@tanstack/react-router'
import { SaleDetailPage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/sales/$id')({
  component: SaleDetailPage,
})
