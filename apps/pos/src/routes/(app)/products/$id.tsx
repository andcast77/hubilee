import { createFileRoute } from '@tanstack/react-router'
import { ProductEditPage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/products/$id')({
  component: ProductEditPage,
})
