import { createFileRoute } from '@tanstack/react-router'
import { SupplierList } from '@/components/features/suppliers/SupplierList'
import { PageFrame } from '@/views/PageFrame'

export const Route = createFileRoute('/(app)/suppliers/')({
  component: SuppliersPage,
})

function SuppliersPage() {
  return (
    <PageFrame title="Proveedores">
      <SupplierList />
    </PageFrame>
  )
}
