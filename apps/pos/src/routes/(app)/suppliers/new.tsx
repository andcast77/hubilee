import { createFileRoute } from '@tanstack/react-router'
import { SupplierCreatePage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/suppliers/new')({
  component: SupplierCreatePage,
})
