import { createFileRoute } from '@tanstack/react-router'
import { ProductCreatePage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/products/new')({
  component: ProductCreatePage,
})
