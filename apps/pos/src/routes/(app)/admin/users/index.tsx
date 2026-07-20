import { createFileRoute } from '@tanstack/react-router'
import { UserList } from '@/components/features/users/UserList'
import { PageFrame } from '@/views/PageFrame'

export const Route = createFileRoute('/(app)/admin/users/')({
  component: UsersPage,
})

function UsersPage() {
  return (
    <PageFrame title="Usuarios">
      <UserList />
    </PageFrame>
  )
}
