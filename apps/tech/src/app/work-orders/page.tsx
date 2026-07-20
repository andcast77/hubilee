"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { techServicesApi, type ApiResponse } from "@/lib/api/client";

type WorkOrder = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  requestedAt: string;
  dueAt?: string | null;
  completedAt?: string | null;
  asset?: { id: string; name: string; serialNumber?: string | null } | null;
  assignedEmployee?: { id: string; firstName?: string; lastName?: string } | null;
};

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    status: "OPEN",
  });

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await techServicesApi.get<
        ApiResponse<WorkOrder[]> & { pagination?: { total: number } }
      >("/work-orders?page=1&limit=50");
      if (!response.success) {
        setError(response.error || "Error al cargar ordenes");
        return;
      }
      setOrders(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar ordenes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError("El titulo es requerido");
      return;
    }
    try {
      const response = await techServicesApi.post<ApiResponse<{ id: string }>>("/work-orders", {
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        status: form.status,
      });
      if (!response.success) {
        setError(response.error || "Error al crear orden");
        return;
      }
      setForm({ title: "", description: "", priority: "MEDIUM", status: "OPEN" });
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear orden");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Ordenes de trabajo</h1>
          <p className="text-slate-600">Gestiona solicitudes y avances.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Titulo *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Reparacion de equipo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                rows={3}
                placeholder="Detalles del trabajo..."
              />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Crear orden
            </button>
          </div>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
            Ordenes recientes
          </div>
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Cargando ordenes...</div>
          ) : orders.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">Aun no hay ordenes registradas.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {orders.map((order) => (
                <div key={order.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{order.title}</p>
                      <p className="text-xs text-slate-500">
                        {order.asset?.name || "Sin activo"} · {order.status}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">{order.priority}</span>
                  </div>
                  {order.description && (
                    <p className="mt-2 text-xs text-slate-600">{order.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
