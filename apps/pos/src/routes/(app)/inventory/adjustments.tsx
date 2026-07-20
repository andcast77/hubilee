import { createFileRoute } from '@tanstack/react-router'
import { InventoryAdjustmentsPage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/inventory/adjustments')({
  component: InventoryAdjustmentsPage,
})
