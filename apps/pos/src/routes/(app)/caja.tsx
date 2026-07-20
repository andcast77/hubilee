import { createFileRoute } from '@tanstack/react-router'
import { CajaManagementPage } from '@/views/CajaManagementPage'

export const Route = createFileRoute('/(app)/caja')({
  component: CajaManagementPage,
})
