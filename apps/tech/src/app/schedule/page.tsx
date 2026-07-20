"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { techServicesApi, type ApiResponse } from "@/lib/api/client";

type WorkOrder = { id: string; title: string };
type Visit = {
  id: string;
  workOrderId: string;
  scheduledStartAt: string;
  scheduledEndAt?: string | null;
  status: string;
  notes?: string | null;
};

export default function SchedulePage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    scheduledStartAt: "",
    scheduledEndAt: "",
    status: "SCHEDULED",
    notes: "",
  });

  const loadOrders = async () => {
    const response = await techServicesApi.get<
      ApiResponse<WorkOrder[]> & { pagination?: { total: number } }
    >("/work-orders?page=1&limit=100");
    if (!response.success) {
      throw new Error(response.error || "Error al cargar ordenes");
    }
    setOrders(response.data || []);
    if (!selectedOrderId && response.data && response.data.length > 0) {
      setSelectedOrderId(response.data[0].id);
    }
  };

  const loadVisits = async (orderId: string) => {
    if (!orderId) {
      setVisits([]);
      return;
    }
    const response = await techServicesApi.get<ApiResponse<Visit[]>>(
      `/work-orders/${orderId}/visits`
    );
    if (!response.success) {
      throw new Error(response.error || "Error al cargar visitas");
    }
    setVisits(response.data || []);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.resolve()
      .then(loadOrders)
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedOrderId) return;
    void loadVisits(selectedOrderId).catch((err) =>
      setError(err instanceof Error ? err.message : "Error al cargar visitas")
    );
  }, [selectedOrderId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!selectedOrderId) {
      setError("Selecciona una orden");
      return;
    }
    if (!form.scheduledStartAt) {
      setError("La fecha de inicio es requerida");
      return;
    }

    try {
      const response = await techServicesApi.post<ApiResponse<Visit>>(
        `/work-orders/${selectedOrderId}/visits`,
        {
          scheduledStartAt: new Date(form.scheduledStartAt).toISOString(),
          scheduledEndAt: form.scheduledEndAt ? new Date(form.scheduledEndAt).toISOString() : null,
          status: form.status,
          notes: form.notes.trim() || null,
        }
      );
      if (!response.success) {
        setError(response.error || "Error al crear visita");
        return;
      }
      setForm({ scheduledStartAt: "", scheduledEndAt: "", status: "SCHEDULED", notes: "" });
      await loadVisits(selectedOrderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear visita");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Agenda tecnica</h1>
          <p className="text-slate-600">Visitas y asignaciones.</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Orden</label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              >
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Inicio *</label>
              <input
                type="datetime-local"
                value={form.scheduledStartAt}
                onChange={(e) => setForm({ ...form, scheduledStartAt: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fin</label>
              <input
                type="datetime-local"
                value={form.scheduledEndAt}
                onChange={(e) => setForm({ ...form, scheduledEndAt: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="SCHEDULED">Programada</option>
                <option value="IN_PROGRESS">En progreso</option>
                <option value="COMPLETED">Completada</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Notas"
              />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Programar visita
            </button>
          </div>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
            Visitas programadas
          </div>
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Cargando visitas...</div>
          ) : visits.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No hay visitas para esta orden.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visits.map((visit) => (
                <div key={visit.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{visit.status}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(visit.scheduledStartAt).toLocaleString()} -
                        {visit.scheduledEndAt ? ` ${new Date(visit.scheduledEndAt).toLocaleString()}` : " pendiente"}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">{visit.notes || "Sin notas"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
