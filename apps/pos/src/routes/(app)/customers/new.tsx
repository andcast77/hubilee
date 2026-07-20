import { createFileRoute } from '@tanstack/react-router'
import { CustomerCreatePage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/customers/new')({
  component: CustomerCreatePage,
})
