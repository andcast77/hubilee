import { createFileRoute } from '@tanstack/react-router'
import { RegisterPage } from '@/views/RegisterPage'

export const Route = createFileRoute('/(public)/register/')({
  component: RegisterPage,
})
