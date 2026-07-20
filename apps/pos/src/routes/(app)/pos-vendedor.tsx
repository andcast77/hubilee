import { createFileRoute } from '@tanstack/react-router'
import { VendorOrderPage } from '@/views/VendorOrderPage'

export const Route = createFileRoute('/(app)/pos-vendedor')({
  component: VendorOrderPage,
})
