import { UserList } from "@/components/features/users/UserList";
import { PageFrame } from "@/views/PageFrame";

export default function Page() {
  return (
    <PageFrame title="Usuarios">
      <UserList />
    </PageFrame>
  );
}
