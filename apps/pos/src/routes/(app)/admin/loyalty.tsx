import { createFileRoute } from '@tanstack/react-router'
import { LoyaltyPage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/admin/loyalty')({
  component: LoyaltyPage,
})
