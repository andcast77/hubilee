"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { techServicesApi, type ApiResponse } from "@/lib/api/client";

type Asset = {
  id: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    serialNumber: "",
    customerName: "",
    customerPhone: "",
  });

  const loadAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await techServicesApi.get<ApiResponse<Asset[]>>("/assets");
      if (!response.success) {
        setError(response.error || "Error al cargar activos");
        return;
      }
      setAssets(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar activos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssets();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("El nombre es requerido");
      return;
    }
    try {
      const response = await techServicesApi.post<ApiResponse<Asset>>("/assets", {
        name: form.name.trim(),
        serialNumber: form.serialNumber.trim() || null,
        customerName: form.customerName.trim() || null,
        customerPhone: form.customerPhone.trim() || null,
      });
      if (!response.success) {
        setError(response.error || "Error al crear activo");
        return;
      }
      setForm({ name: "", serialNumber: "", customerName: "", customerPhone: "" });
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear activo");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Activos</h1>
          <p className="text-slate-600">Equipos y activos de clientes.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Equipo o activo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Serie</label>
              <input
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="SN-000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
              <input
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Nombre del cliente"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefono</label>
              <input
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="+34 600 000 000"
              />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Guardar activo
            </button>
          </div>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
            Lista de activos
          </div>
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Cargando activos...</div>
          ) : assets.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">Aun no hay activos registrados.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {assets.map((asset) => (
                <div key={asset.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{asset.name}</p>
                      <p className="text-xs text-slate-500">
                        {asset.serialNumber || "Sin serie"} · {asset.customerName || "Sin cliente"}
                      </p>
                    </div>
                    <span className={`text-xs ${asset.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                      {asset.isActive ? "Activo" : "Inactivo"}
                    </span>
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
