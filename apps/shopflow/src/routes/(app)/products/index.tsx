import { createFileRoute } from '@tanstack/react-router'
import { ProductList } from '@/components/features/products/ProductList'
import { PageFrame } from '@/views/PageFrame'

export const Route = createFileRoute('/(app)/products/')({
  component: ProductsPage,
})

function ProductsPage() {
  return (
    <PageFrame title="Productos">
      <ProductList />
    </PageFrame>
  )
}
