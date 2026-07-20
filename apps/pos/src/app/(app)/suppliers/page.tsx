import { SupplierList } from "@/components/features/suppliers/SupplierList";
import { PageFrame } from "@/views/PageFrame";

export default function Page() {
  return (
    <PageFrame title="Proveedores">
      <SupplierList />
    </PageFrame>
  );
}
