import { createFileRoute } from '@tanstack/react-router'
import { CustomerEditPage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/customers/$id')({
  component: CustomerEditPage,
})
