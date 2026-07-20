import { createFileRoute } from '@tanstack/react-router'
import { RegisterVerifyPage } from '@/views/RegisterVerifyPage'

export const Route = createFileRoute('/(public)/register/verify')({
  component: RegisterVerifyPage,
})
