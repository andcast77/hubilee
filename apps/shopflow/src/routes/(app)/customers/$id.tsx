import { createFileRoute } from '@tanstack/react-router'
import { CustomerEditPage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/customers/$id')({
  component: CustomerEditPage,
})
