'use client'

import { useAttendanceStats } from '@/hooks/api/useAttendanceStats'
import { useDashboardAlerts } from '@/hooks/useDashboardAlerts'
import { Badge, Card } from '@hubilee/ui'
import { AlertTriangle, Loader2, CheckCircle, PartyPopper } from 'lucide-react'

export function DailyAlerts() {
  const { stats: att, loading: attLoading, error: attError } = useAttendanceStats()
  const { alerts, loading: alertsLoading, error: alertsError } = useDashboardAlerts()

  const loading = attLoading || alertsLoading
  const error = attError || alertsError

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Cargando alertas...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">Error al cargar alertas: {error}</span>
        </div>
      </Card>
    )
  }

  if (!att) {
    return null
  }

  if (!att.isWorkDay) {
    return (
      <div className="space-y-3">
        <Card className="p-4 border-l-4 border-purple-200 bg-purple-50">
          <div className="flex items-start gap-3">
            <PartyPopper className="h-5 w-5 mt-0.5 text-purple-600" />
            <div className="flex-1">
              <h4 className="font-medium text-purple-800">Día no laborable</h4>
              <p className="text-sm text-gray-700 mt-1">{att.workDayReason || 'Hoy no aplica control de asistencia.'}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              Info
            </Badge>
          </div>
        </Card>
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">No hay alertas críticas para hoy.</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <Card
          key={`${alert.type}-${index}`}
          className={`p-4 border-l-4 ${
            alert.priority === 'high'
              ? 'border-red-300 bg-red-50'
              : alert.priority === 'medium'
                ? 'border-amber-300 bg-amber-50'
                : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`h-5 w-5 mt-0.5 shrink-0 ${
                alert.priority === 'high' ? 'text-red-600' : alert.priority === 'medium' ? 'text-amber-600' : 'text-slate-500'
              }`}
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900">{alert.title}</h4>
              <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
            </div>
            <Badge variant={alert.priority === 'high' ? 'destructive' : 'outline'} className="text-xs shrink-0">
              {alert.type}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  )
}
