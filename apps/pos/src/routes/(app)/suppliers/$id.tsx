import { createFileRoute } from '@tanstack/react-router'
import { SupplierEditPage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/suppliers/$id')({
  component: SupplierEditPage,
})
