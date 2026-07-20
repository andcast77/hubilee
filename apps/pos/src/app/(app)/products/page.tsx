import { ProductList } from "@/components/features/products/ProductList";
import { PageFrame } from "@/views/PageFrame";

export default function Page() {
  return (
    <PageFrame title="Productos">
      <ProductList />
    </PageFrame>
  );
}
