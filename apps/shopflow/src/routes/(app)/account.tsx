import { createFileRoute } from '@tanstack/react-router'
import { AccountPage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/account')({
  component: AccountPage,
})
