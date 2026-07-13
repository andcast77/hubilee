import { createFileRoute } from '@tanstack/react-router'
import { CategoriesPage } from '@/views/ShopflowPages'

export const Route = createFileRoute('/(app)/categories')({
  component: CategoriesPage,
})
