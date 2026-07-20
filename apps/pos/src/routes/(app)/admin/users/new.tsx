import { createFileRoute } from '@tanstack/react-router'
import { UserCreatePage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/admin/users/new')({
  component: UserCreatePage,
})
