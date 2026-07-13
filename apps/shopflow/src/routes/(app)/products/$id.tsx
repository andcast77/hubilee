import { createFileRoute } from '@tanstack/react-router'
import { ProductEditPage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/products/$id')({
  component: ProductEditPage,
})
