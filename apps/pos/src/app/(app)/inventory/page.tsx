import { LowStockAlert } from "@/components/features/inventory/LowStockAlert";
import { PageFrame } from "@/views/PageFrame";

export default function Page() {
  return (
    <PageFrame title="Inventario">
      <LowStockAlert />
    </PageFrame>
  );
}
