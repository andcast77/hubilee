import { createFileRoute } from '@tanstack/react-router'
import { SupplierCreatePage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/suppliers/new')({
  component: SupplierCreatePage,
})
