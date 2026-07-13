import { createFileRoute } from '@tanstack/react-router'
import { SupplierEditPage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/suppliers/$id')({
  component: SupplierEditPage,
})
