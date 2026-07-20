import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '@/views/LandingPage'

export const Route = createFileRoute('/(public)/')({
  component: LandingPage,
})
