import { createFileRoute } from '@tanstack/react-router'
import { POSPage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/pos')({
  component: POSPage,
})
