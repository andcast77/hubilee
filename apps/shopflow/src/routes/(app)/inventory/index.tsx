import { createFileRoute } from '@tanstack/react-router'
import { LowStockAlert } from '@/components/features/inventory/LowStockAlert'
import { PageFrame } from '@/views/PageFrame'

export const Route = createFileRoute('/(app)/inventory/')({
  component: InventoryPage,
})

function InventoryPage() {
  return (
    <PageFrame title="Inventario">
      <LowStockAlert />
    </PageFrame>
  )
}
