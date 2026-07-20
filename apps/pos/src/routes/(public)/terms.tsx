import { createFileRoute } from '@tanstack/react-router'
import { TermsPage } from '@/views/TermsPage'

export const Route = createFileRoute('/(public)/terms')({
  component: TermsPage,
})
