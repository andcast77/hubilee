import { createFileRoute } from '@tanstack/react-router'
import { CustomerList } from '@/components/features/customers/CustomerList'
import { PageFrame } from '@/views/PageFrame'

export const Route = createFileRoute('/(app)/customers/')({
  component: CustomersPage,
})

function CustomersPage() {
  return (
    <PageFrame title="Clientes">
      <CustomerList />
    </PageFrame>
  )
}
