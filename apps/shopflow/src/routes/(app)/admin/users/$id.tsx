import { createFileRoute } from '@tanstack/react-router'
import { UserEditPage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/admin/users/$id')({
  component: UserEditPage,
})
