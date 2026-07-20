import { createFileRoute } from '@tanstack/react-router'
import { POSPage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/pos')({
  component: POSPage,
})
