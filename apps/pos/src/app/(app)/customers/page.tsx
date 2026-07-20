import { CustomerList } from "@/components/features/customers/CustomerList";
import { PageFrame } from "@/views/PageFrame";

export default function Page() {
  return (
    <PageFrame title="Clientes">
      <CustomerList />
    </PageFrame>
  );
}
