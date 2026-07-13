import { createFileRoute } from '@tanstack/react-router'
import { InventoryAdjustmentsPage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/inventory/adjustments')({
  component: InventoryAdjustmentsPage,
})
