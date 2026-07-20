"use client";

import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@hubilee/ui";
import { PageFrame } from "@/views/PageFrame";
import { StatsCards } from "@/components/features/reports/StatsCards";
import { DashboardBusinessMetrics } from "@/components/features/reports/DashboardBusinessMetrics";
import { DailySalesChart } from "@/components/features/reports/DailySalesChart";
import { TopProductsTable } from "@/components/features/reports/TopProductsTable";
import { ProductPanel } from "@/components/features/pos/ProductPanel";
import { ShoppingCart } from "@/components/features/pos/ShoppingCart";
import { TotalsPanel } from "@/components/features/pos/TotalsPanel";
import { PaymentModal } from "@/components/features/pos/PaymentModal";
import { ReceiptModal } from "@/components/features/pos/ReceiptModal";
import { CustomerSelector } from "@/components/features/pos/CustomerSelector";
import { StoreSelector } from "@/components/features/pos/StoreSelector";
import { CashSessionBar } from "@/components/features/pos/CashSessionBar";
import { RegisterSelector } from "@/components/features/pos/RegisterSelector";
import { useOpenCashSession } from "@/hooks/useCashSession";
import { useSelectedRegisterId } from "@/hooks/useSelectedRegister";
import { ProductForm } from "@/components/features/products/ProductForm";
import { CustomerForm } from "@/components/features/customers/CustomerForm";
import { SupplierForm } from "@/components/features/suppliers/SupplierForm";
import { UserForm } from "@/components/features/users/UserForm";
import { InventoryOverview } from "@/components/features/inventory/InventoryOverview";
import { InventoryAdjustmentForm } from "@/components/features/inventory/InventoryAdjustmentForm";
import { LowStockAlert } from "@/components/features/inventory/LowStockAlert";
import { StoreConfigForm } from "@/components/features/store-config/StoreConfigForm";
import { TicketConfigForm } from "@/components/features/settings/TicketConfigForm";
import { useStoreContextOptional } from "@/components/providers/StoreContext";
import { useInventoryStats } from "@/hooks/useReports";
import { useStoreConfig, useUpdateStoreConfig } from "@/hooks/useStoreConfig";
import { useTicketConfig, useUpdateTicketConfig } from "@/hooks/useTicketConfig";
import { useCreateProduct, useProduct, useUpdateProduct, useProducts } from "@/hooks/useProducts";
import { useCategories, useCreateCategory, useDeleteCategory } from "@/hooks/useCategories";
import { useCreateCustomer, useCustomer, useUpdateCustomer } from "@/hooks/useCustomers";
import { useCreateSupplier, useSupplier, useUpdateSupplier } from "@/hooks/useSuppliers";
import { useCreateUser, useUser, useUpdateUser } from "@/hooks/useUsers";
import { useSale, useSales } from "@/hooks/useSales";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { useLoyaltyConfig, useUpdateLoyaltyConfig } from "@/hooks/useLoyalty";
import { useStoreConfig as usePosStoreConfig } from "@/hooks/useStoreConfig";
import { authApi } from "@/lib/api/client";
import { clearDesktopSession } from "@/lib/platform";

export function DashboardPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");
  const storeContext = useStoreContextOptional();
  const storeId = storeContext?.reportStoreId ?? storeContext?.currentStoreId ?? undefined;
  return (
    <PageFrame title="Dashboard">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button size="sm" variant={period === "today" ? "default" : "outline"} onClick={() => setPeriod("today")}>Hoy</Button>
          <Button size="sm" variant={period === "week" ? "default" : "outline"} onClick={() => setPeriod("week")}>Semana</Button>
          <Button size="sm" variant={period === "month" ? "default" : "outline"} onClick={() => setPeriod("month")}>Mes</Button>
        </div>
        <StatsCards period={period} storeId={storeId} />
        <DashboardBusinessMetrics period={period} storeId={storeId} />
        <DailySalesChart days={period === "today" ? 7 : period === "week" ? 30 : 90} storeId={storeId} />
        <TopProductsTable storeId={storeId} />
      </div>
    </PageFrame>
  );
}

export function POSPage() {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null);
  const { data: storeConfig } = usePosStoreConfig();
  const storeContext = useStoreContextOptional();
  const storeId = storeContext?.currentStoreId ?? null;
  // FIX 1 (pos-cash-session, CRITICAL): a store can have several registers, each with its
  // own OPEN session — `RegisterSelector` lets the cashier pick WHICH register they're on,
  // persisted per store, and checkout binds to THAT register's session (not "the store's"
  // ambiguous most-recent one). `CashSessionBar` renders the open/close-caja gate for the
  // same registerId, this hook shares the same cached query so the checkout button and the
  // payment modal gate on the exact same session.
  const [selectedRegisterId, setSelectedRegisterId] = useSelectedRegisterId(storeId);
  const { session: cashSession } = useOpenCashSession(storeId, selectedRegisterId);
  return (
    <PageFrame title="Punto de Venta">
      <div className="h-[calc(100vh-12rem)] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">POS</h2>
          <div className="flex items-center gap-3">
            <RegisterSelector storeId={storeId} registerId={selectedRegisterId} onChange={setSelectedRegisterId} />
            <StoreSelector />
          </div>
        </div>
        <CashSessionBar registerId={selectedRegisterId} />
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
          <div className="lg:col-span-5 overflow-hidden"><ProductPanel /></div>
          <div className="lg:col-span-7 flex flex-col gap-4 overflow-hidden">
            <CustomerSelector />
            <div className="flex-1 min-h-0"><ShoppingCart /></div>
            <TotalsPanel
              onCheckout={() => setPaymentModalOpen(true)}
              taxRate={storeConfig?.taxRate || 0}
              disabled={!cashSession}
              disabledReason="Abre la caja antes de cobrar."
            />
          </div>
        </div>
      </div>
      {cashSession && (
        <PaymentModal
          open={paymentModalOpen}
          cashSessionId={cashSession.id}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={(saleId) => {
            setCompletedSaleId(saleId);
            setReceiptModalOpen(true);
          }}
        />
      )}
      <ReceiptModal
        saleId={completedSaleId}
        open={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false);
          setCompletedSaleId(null);
        }}
      />
    </PageFrame>
  );
}

export function CategoriesPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { data = [], isLoading } = useCategories();
  const createMutation = useCreateCategory();
  const deleteMutation = useDeleteCategory();
  return (
    <PageFrame
      title="Categorias"
      breadcrumbs={[
        { label: "Panel", href: "/dashboard" },
        { label: "Categorías" },
      ]}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Nueva categoria</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripcion" />
            <Button
              onClick={async () => {
                if (!name.trim()) return;
                await createMutation.mutateAsync({ name: name.trim(), description: description || undefined });
                setName("");
                setDescription("");
              }}
              disabled={createMutation.isPending}
            >
              Crear
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Listado</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? <p>Cargando...</p> : data.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between rounded border p-2">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.description || "Sin descripcion"}</p>
                </div>
                <Button variant="outline" onClick={() => deleteMutation.mutate(c.id)}>Eliminar</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageFrame>
  );
}

function CrudGuard({ children, loading, notFound }: { children: React.ReactNode; loading: boolean; notFound: boolean }) {
  if (loading) return <PageFrame title="Cargando"><p>Cargando...</p></PageFrame>;
  if (notFound) return <PageFrame title="No encontrado"><p>Registro no encontrado.</p></PageFrame>;
  return <>{children}</>;
}

export function ProductCreatePage() {
  const navigate = useNavigate();
  const mutation = useCreateProduct();
  return (
    <PageFrame
      title="Nuevo Producto"
      breadcrumbs={[
        { label: "Productos", href: "/products" },
        { label: "Nuevo" },
      ]}
    >
      <ProductForm onSubmit={async (data) => { await mutation.mutateAsync(data as any); void navigate({ to: "/products" }); }} isLoading={mutation.isPending} />
    </PageFrame>
  );
}
export function ProductEditPage() {
  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id ?? "";
  const navigate = useNavigate();
  const { data, isLoading } = useProduct(id);
  const mutation = useUpdateProduct();
  const productName =
    data && typeof (data as { name?: string }).name === "string"
      ? (data as { name: string }).name
      : "Producto";
  return (
    <CrudGuard loading={isLoading} notFound={!data}>
      <PageFrame
        title="Editar producto"
        breadcrumbs={[
          { label: "Productos", href: "/products" },
          { label: productName },
          { label: "Editar" },
        ]}
      >
        <ProductForm
          initialData={data as any}
          onSubmit={async (form) => {
            await mutation.mutateAsync({ id, data: form as any });
            void navigate({ to: "/products" });
          }}
          isLoading={mutation.isPending}
        />
      </PageFrame>
    </CrudGuard>
  );
}
export function CustomerCreatePage() {
  const navigate = useNavigate();
  const mutation = useCreateCustomer();
  return (
    <PageFrame
      title="Nuevo Cliente"
      breadcrumbs={[
        { label: "Clientes", href: "/customers" },
        { label: "Nuevo" },
      ]}
    >
      <CustomerForm onSubmit={async (data) => { await mutation.mutateAsync(data as any); void navigate({ to: "/customers" }); }} isLoading={mutation.isPending} />
    </PageFrame>
  );
}
export function CustomerEditPage() {
  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id ?? "";
  const navigate = useNavigate();
  const { data, isLoading } = useCustomer(id);
  const mutation = useUpdateCustomer();
  const customerName =
    data && typeof (data as { name?: string }).name === "string"
      ? (data as { name: string }).name
      : "Cliente";
  return (
    <CrudGuard loading={isLoading} notFound={!data}>
      <PageFrame
        title="Editar Cliente"
        breadcrumbs={[
          { label: "Clientes", href: "/customers" },
          { label: customerName },
          { label: "Editar" },
        ]}
      >
        <CustomerForm initialData={data as any} onSubmit={async (form) => { await mutation.mutateAsync({ id, data: form as any }); void navigate({ to: "/customers" }); }} isLoading={mutation.isPending} />
      </PageFrame>
    </CrudGuard>
  );
}
export function SupplierCreatePage() {
  const navigate = useNavigate();
  const mutation = useCreateSupplier();
  return (
    <PageFrame
      title="Nuevo Proveedor"
      breadcrumbs={[
        { label: "Proveedores", href: "/suppliers" },
        { label: "Nuevo" },
      ]}
    >
      <SupplierForm onSubmit={async (data) => { await mutation.mutateAsync(data as any); void navigate({ to: "/suppliers" }); }} isLoading={mutation.isPending} />
    </PageFrame>
  );
}
export function SupplierEditPage() {
  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id ?? "";
  const navigate = useNavigate();
  const { data, isLoading } = useSupplier(id);
  const mutation = useUpdateSupplier();
  const supplierName =
    data && typeof (data as { name?: string }).name === "string"
      ? (data as { name: string }).name
      : "Proveedor";
  return (
    <CrudGuard loading={isLoading} notFound={!data}>
      <PageFrame
        title="Editar Proveedor"
        breadcrumbs={[
          { label: "Proveedores", href: "/suppliers" },
          { label: supplierName },
          { label: "Editar" },
        ]}
      >
        <SupplierForm initialData={data as any} onSubmit={async (form) => { await mutation.mutateAsync({ id, data: form as any }); void navigate({ to: "/suppliers" }); }} isLoading={mutation.isPending} />
      </PageFrame>
    </CrudGuard>
  );
}
export function UserCreatePage() {
  const navigate = useNavigate();
  const mutation = useCreateUser();
  return (
    <PageFrame
      title="Nuevo Usuario"
      breadcrumbs={[
        { label: "Usuarios", href: "/admin/users" },
        { label: "Nuevo" },
      ]}
    >
      <UserForm onSubmit={async (data) => { await mutation.mutateAsync(data as any); void navigate({ to: "/admin/users" }); }} isLoading={mutation.isPending} />
    </PageFrame>
  );
}
export function UserEditPage() {
  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id ?? "";
  const navigate = useNavigate();
  const { data, isLoading } = useUser(id);
  const mutation = useUpdateUser();
  const userName =
    data && typeof (data as { name?: string }).name === "string"
      ? (data as { name: string }).name
      : "Usuario";
  return (
    <CrudGuard loading={isLoading} notFound={!data}>
      <PageFrame
        title="Editar Usuario"
        breadcrumbs={[
          { label: "Usuarios", href: "/admin/users" },
          { label: userName },
          { label: "Editar" },
        ]}
      >
        <UserForm isEdit initialData={data as any} onSubmit={async (form) => { await mutation.mutateAsync({ id, data: form as any }); void navigate({ to: "/admin/users" }); }} isLoading={mutation.isPending} />
      </PageFrame>
    </CrudGuard>
  );
}

export function SaleDetailPage() {
  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id ?? "";
  const { data: sale, isLoading } = useSale(id);
  const { data: storeConfig } = useStoreConfig();
  const currency = storeConfig?.currency ?? "USD";

  if (isLoading) {
    return (
      <PageFrame title="Detalle de venta">
        <p className="text-slate-600">Cargando venta…</p>
      </PageFrame>
    );
  }
  if (!sale) {
    return (
      <PageFrame title="Venta no encontrada">
        <p className="text-slate-600">No se encontró la venta.</p>
      </PageFrame>
    );
  }

  const s = sale as typeof sale & {
    invoiceNumber?: string | null;
    total: number;
    subtotal: number;
    tax: number;
    status: string;
    createdAt: string | Date;
    customer: { name: string } | null;
    items: Array<{
      id: string;
      quantity: number;
      price: number;
      subtotal: number;
      product: { name: string; sku: string };
    }>;
  };

  const label = s.invoiceNumber ?? s.id.slice(0, 8);

  return (
    <PageFrame
      title={`Venta ${label}`}
      breadcrumbs={[
        { label: "Reportes", href: "/reports" },
        { label: "Ventas", href: "/reports/sales" },
        { label: String(label) },
      ]}
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
            <CardDescription>{formatDate(s.createdAt)}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Estado</span>
              <Badge variant="outline">{s.status}</Badge>
            </div>
            <div>
              <span className="text-slate-500">Cliente </span>
              {s.customer?.name ?? "—"}
            </div>
            <div>
              <span className="text-slate-500">Subtotal </span>
              {formatCurrency(s.subtotal, currency)}
            </div>
            <div>
              <span className="text-slate-500">Impuestos </span>
              {formatCurrency(s.tax, currency)}
            </div>
            <div className="sm:col-span-2 font-semibold">
              <span className="text-slate-500 font-normal">Total </span>
              {formatCurrency(s.total, currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ítems</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(s.items ?? []).map((it) => (
                <div key={it.id} className="flex justify-between border-b py-2 text-sm">
                  <span>
                    {it.product.name} × {it.quantity}
                  </span>
                  <span>{formatCurrency(it.subtotal, currency)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageFrame>
  );
}

export function ReportsPage() {
  return (
    <PageFrame title="Reportes">
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle>Ventas</CardTitle><CardDescription>Indicadores de ventas y top productos.</CardDescription></CardHeader><CardContent><Link to="/reports/sales"><Button variant="outline">Ver reporte de ventas</Button></Link></CardContent></Card>
        <Card><CardHeader><CardTitle>Inventario</CardTitle><CardDescription>Vista de stock y productos criticos.</CardDescription></CardHeader><CardContent><Link to="/reports/inventory"><Button variant="outline">Ver reporte de inventario</Button></Link></CardContent></Card>
      </div>
    </PageFrame>
  );
}
export function ReportsSalesPage() {
  const storeContext = useStoreContextOptional();
  const storeId = storeContext?.reportStoreId ?? storeContext?.currentStoreId ?? undefined;
  const { data: storeConfig } = useStoreConfig();
  const currency = storeConfig?.currency ?? "USD";
  const { data: salesData, isLoading: salesLoading } = useSales({ page: 1, limit: 15 });
  const recentSales = salesData?.sales ?? [];

  return (
    <PageFrame
      title="Reporte de Ventas"
      breadcrumbs={[
        { label: "Reportes", href: "/reports" },
        { label: "Ventas" },
      ]}
    >
      <div className="space-y-4">
        <StatsCards period="month" storeId={storeId} />
        <DailySalesChart days={30} storeId={storeId} />
        <TopProductsTable storeId={storeId} />
        <Card>
          <CardHeader>
            <CardTitle>Ventas recientes</CardTitle>
            <CardDescription>
              Selecciona una venta para ver el detalle (también desde enlaces en alertas y recibos).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <p className="text-sm text-slate-500">Cargando ventas…</p>
            ) : recentSales.length === 0 ? (
              <p className="text-sm text-slate-500">No hay ventas recientes en este período.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {recentSales.map((sale: { id: string; invoiceNumber?: string | null; total: number; createdAt: string | Date; status: string }) => (
                  <li key={sale.id}>
                    <Link
                      to="/sales/$id"
                      params={{ id: sale.id }}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <span className="font-medium">{sale.invoiceNumber ?? sale.id.slice(0, 8)}</span>
                      <span className="text-slate-600">{formatDate(sale.createdAt)}</span>
                      <span className="text-slate-800">{formatCurrency(sale.total, currency)}</span>
                      <Badge variant="outline" className="text-xs">
                        {sale.status}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageFrame>
  );
}
export function ReportsInventoryPage() {
  const storeContext = useStoreContextOptional();
  const storeId = storeContext?.reportStoreId ?? storeContext?.currentStoreId ?? undefined;
  const { data } = useInventoryStats(storeId);
  return (
    <PageFrame
      title="Reporte de Inventario"
      breadcrumbs={[
        { label: "Reportes", href: "/reports" },
        { label: "Inventario" },
      ]}
    >
      <div className="space-y-6">
        <InventoryOverview />
        <Card>
          <CardHeader><CardTitle>Productos con stock</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.products ?? []).map((p) => <div key={p.id} className="flex justify-between border-b py-2 text-sm"><span>{p.name}</span><span>Stock: {p.stock}</span></div>)}
          </CardContent>
        </Card>
      </div>
    </PageFrame>
  );
}

export function InventoryLowStockPage() {
  return (
    <PageFrame
      title="Stock Bajo"
      breadcrumbs={[
        { label: "Inventario", href: "/inventory" },
        { label: "Stock bajo" },
      ]}
    >
      <LowStockAlert />
    </PageFrame>
  );
}
export function InventoryAdjustmentsPage() {
  const { data } = useProducts();
  const first = useMemo(() => (Array.isArray(data) && data.length > 0 ? data[0] : null), [data]);
  return (
    <PageFrame
      title="Ajustes de Inventario"
      breadcrumbs={[
        { label: "Inventario", href: "/inventory" },
        { label: "Ajustes" },
      ]}
    >
      {!first ? <p>No hay productos para ajustar.</p> : <InventoryAdjustmentForm productId={first.id} currentStock={first.stock ?? 0} onSubmit={async () => Promise.resolve()} />}
    </PageFrame>
  );
}

export function AdminSettingsPage() {
  const { data: storeConfig } = useStoreConfig();
  const { data: ticketConfig } = useTicketConfig();
  const updateStore = useUpdateStoreConfig();
  const updateTicket = useUpdateTicketConfig();
  if (!storeConfig || !ticketConfig) {
    return (
      <PageFrame title="Configuracion" breadcrumbs={[{ label: "Panel", href: "/dashboard" }, { label: "Configuración" }]}>
        <p>Cargando...</p>
      </PageFrame>
    );
  }
  return (
    <PageFrame
      title="Configuracion"
      breadcrumbs={[
        { label: "Panel", href: "/dashboard" },
        { label: "Configuración" },
      ]}
    >
      <div className="space-y-8">
        <Card><CardHeader><CardTitle>Configuracion de tienda</CardTitle></CardHeader><CardContent><StoreConfigForm initialData={storeConfig as any} onSubmit={async (d) => { await updateStore.mutateAsync(d); }} isLoading={updateStore.isPending} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Configuracion de ticket</CardTitle></CardHeader><CardContent><TicketConfigForm initialData={ticketConfig as any} onSubmit={async (d) => { await updateTicket.mutateAsync(d); }} isLoading={updateTicket.isPending} /></CardContent></Card>
      </div>
    </PageFrame>
  );
}
export function LoyaltyPage() {
  const { data } = useLoyaltyConfig();
  const update = useUpdateLoyaltyConfig();
  const [pointsPerDollar, setPointsPerDollar] = useState("1");
  const [redemptionRate, setRedemptionRate] = useState("0.01");
  return (
    <PageFrame
      title="Lealtad"
      breadcrumbs={[
        { label: "Panel", href: "/dashboard" },
        { label: "Programa de lealtad" },
      ]}
    >
      <Card>
        <CardHeader><CardTitle>Configuracion de puntos</CardTitle><CardDescription>Alineado con `/api/shopflow/loyalty/config`.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {data ? <pre className="text-xs bg-slate-100 p-3 rounded">{JSON.stringify(data, null, 2)}</pre> : null}
          <div><Label>Puntos por compra</Label><Input value={pointsPerDollar} onChange={(e) => setPointsPerDollar(e.target.value)} /></div>
          <div><Label>Factor redencion</Label><Input value={redemptionRate} onChange={(e) => setRedemptionRate(e.target.value)} /></div>
          <Button onClick={() => update.mutate({ pointsPerDollar: Number(pointsPerDollar), redemptionRate: Number(redemptionRate) })} disabled={update.isPending}>Guardar</Button>
        </CardContent>
      </Card>
    </PageFrame>
  );
}

export function AccountPage() {
  const navigate = useNavigate();
  const handleLogout = async () => {
    try { await authApi.post("/logout"); } catch {}
    // Desktop has no session cookie for the API to clear server-side alone —
    // wipe the locally stored Bearer tokens too (no-op on web).
    await clearDesktopSession();
    void navigate({ to: "/login", replace: true });
  };
  return (
    <PageFrame title="Mi Cuenta" breadcrumbs={[{ label: "Panel", href: "/dashboard" }, { label: "Mi cuenta" }]}>
      <Card>
        <CardHeader><CardTitle>Sesion</CardTitle><CardDescription>Gestion de sesion y datos de usuario.</CardDescription></CardHeader>
        <CardContent><Button variant="outline" onClick={handleLogout}>Cerrar sesion</Button></CardContent>
      </Card>
    </PageFrame>
  );
}
