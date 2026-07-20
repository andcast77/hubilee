"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { techApi, authApi } from "@/lib/api/client";
import { useTechDashboardSSE } from "@/hooks/useTechDashboardSSE";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DashboardStats = {
  openOrders: number;
  closedThisWeek: number;
  avgResolutionHours: number;
  overdueOrders: number;
  ordersByStatus: Record<string, number>;
  weeklyOrderTrend: { date: string; opened: number; closed: number }[];
  activeVisits: number;
  techniciansWithActiveVisits: number;
  technicianUtilizationRatio: number;
  assetsCount: number;
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Abierta",
  IN_PROGRESS: "En progreso",
  ON_HOLD: "En espera",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await techApi.get<DashboardStats & { success?: boolean }>("/dashboard/stats");
      setStats({
        openOrders: res.openOrders ?? 0,
        closedThisWeek: res.closedThisWeek ?? 0,
        avgResolutionHours: res.avgResolutionHours ?? 0,
        overdueOrders: res.overdueOrders ?? 0,
        ordersByStatus: res.ordersByStatus ?? {},
        weeklyOrderTrend: res.weeklyOrderTrend ?? [],
        activeVisits: res.activeVisits ?? 0,
        techniciansWithActiveVisits: res.techniciansWithActiveVisits ?? 0,
        technicianUtilizationRatio: res.technicianUtilizationRatio ?? 0,
        assetsCount: res.assetsCount ?? 0,
      });
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    authApi
      .get<{ success?: boolean; data?: { companyId?: string | null } }>("/me")
      .then((r) => {
        const data = r && typeof r === "object" && "data" in r ? r.data : undefined;
        setCompanyId(data?.companyId ?? null);
      })
      .catch(() => setCompanyId(null));
  }, []);

  useTechDashboardSSE(companyId, load);

  const statusChartData = Object.entries(stats?.ordersByStatus ?? {}).map(([key, count]) => ({
    name: STATUS_LABEL[key] ?? key,
    count,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Panel general</h1>
          <p className="text-slate-600">Resumen de órdenes, visitas y tiempos de resolución.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Órdenes abiertas</p>
            <p className="text-2xl font-semibold text-slate-900">{loading ? "—" : stats?.openOrders ?? 0}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Cerradas esta semana</p>
            <p className="text-2xl font-semibold text-slate-900">{loading ? "—" : stats?.closedThisWeek ?? 0}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Tiempo medio resolución (4 sem.)</p>
            <p className="text-2xl font-semibold text-slate-900">
              {loading ? "—" : `${stats?.avgResolutionHours ?? 0} h`}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Órdenes atrasadas / estancadas</p>
            <p className="text-2xl font-semibold text-amber-700">{loading ? "—" : stats?.overdueOrders ?? 0}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Visitas activas</p>
            <p className="text-2xl font-semibold text-slate-900">{loading ? "—" : stats?.activeVisits ?? 0}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Técnicos con visitas</p>
            <p className="text-2xl font-semibold text-slate-900">{loading ? "—" : stats?.techniciansWithActiveVisits ?? 0}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Activos registrados</p>
            <p className="text-2xl font-semibold text-slate-900">{loading ? "—" : stats?.assetsCount ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">
              Ratio visitas/técnico: {loading ? "—" : stats?.technicianUtilizationRatio ?? 0}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Órdenes por estado</h2>
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={56} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" name="Cantidad" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Apertura vs cierre (7 días)</h2>
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.weeklyOrderTrend ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="opened" stroke="#0ea5e9" name="Aperturas" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="closed" stroke="#22c55e" name="Cierres" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
