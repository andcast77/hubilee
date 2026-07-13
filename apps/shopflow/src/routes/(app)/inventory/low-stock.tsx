import { createFileRoute } from '@tanstack/react-router'
import { InventoryLowStockPage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/inventory/low-stock')({
  component: InventoryLowStockPage,
})
