import { createFileRoute } from '@tanstack/react-router'
import { UserEditPage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/admin/users/$id')({
  component: UserEditPage,
})
