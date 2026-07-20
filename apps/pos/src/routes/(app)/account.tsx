import { createFileRoute } from '@tanstack/react-router'
import { AccountPage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/account')({
  component: AccountPage,
})
