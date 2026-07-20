import { createFileRoute } from '@tanstack/react-router'
import { CategoriesPage } from '@/views/POSPages'

export const Route = createFileRoute('/(app)/categories')({
  component: CategoriesPage,
})
