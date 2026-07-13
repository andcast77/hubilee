import { createFileRoute } from '@tanstack/react-router'
import { UserCreatePage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/admin/users/new')({
  component: UserCreatePage,
})
