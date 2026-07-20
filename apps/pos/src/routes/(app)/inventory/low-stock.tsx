import { createFileRoute } from '@tanstack/react-router'
import { InventoryLowStockPage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/inventory/low-stock')({
  component: InventoryLowStockPage,
})
