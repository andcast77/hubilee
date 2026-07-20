'use client'

import { useEffect, useState } from 'react'
import { Card } from '@hubilee/ui'
import { DailyWorkKPIs } from '@/components/dashboard/DailyWorkKPIs'
import { DailyAlerts } from '@/components/dashboard/DailyAlerts'
import { AttendanceTrendChart } from '@/components/dashboard/AttendanceTrendChart'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useHrDashboardSSE } from '@/hooks/useHrDashboardSSE'
import { hrApi } from '@/lib/api/client'
import { Badge } from '@hubilee/ui'
import { Calendar, Users, Clock, TrendingUp, Activity, BarChart3, UserCheck, Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const { stats, loading, weeklyAttendance, departmentAttendance } = useDashboardStats()

  useEffect(() => {
    hrApi
      .get<{ user?: { companyId?: string } }>('/me')
      .then((r) => setCompanyId(r.user?.companyId ?? null))
      .catch(() => setCompanyId(null))
  }, [])

  useHrDashboardSSE(companyId, () => {
    window.dispatchEvent(new Event('hr-dashboard-refresh'))
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Bienvenido al panel de control de Hr</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          {stats && (
            <Badge variant={stats.isWorkDay ? 'default' : 'secondary'} className="ml-2">
              {stats.isWorkDay ? 'Día Laborable' : 'Día No Laborable'}
            </Badge>
          )}
        </div>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Estado de Asistencia</h2>
        </div>
        <DailyWorkKPIs />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Tendencias</h2>
        </div>
        {weeklyAttendance.length > 0 && (
          <AttendanceTrendChart weeklyAttendance={weeklyAttendance} departmentAttendance={departmentAttendance} />
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-orange-600" />
          <h2 className="text-lg font-semibold text-gray-900">Alertas del Día</h2>
        </div>
        <DailyAlerts />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Resumen Rápido</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Empleados</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : stats?.totalEmployees ?? '-'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Programados Hoy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : stats?.todayScheduled ?? '-'}
                </p>
                {stats && !loading && (
                  <p className="text-xs text-gray-500 mt-1">
                    de {stats.todayActive} activos · {stats.todayPresent} con entrada
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Horas Registradas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : stats?.registeredHoursToday ?? '-'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Hoy · tasa 7d: {stats?.weeklyAttendanceRate ?? 0}%</p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
