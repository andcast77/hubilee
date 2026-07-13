import { createFileRoute } from '@tanstack/react-router'
import { CustomerCreatePage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/customers/new')({
  component: CustomerCreatePage,
})
