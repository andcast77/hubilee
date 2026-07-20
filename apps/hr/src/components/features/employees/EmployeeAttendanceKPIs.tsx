'use client';

import { Card } from '@hubilee/ui';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  TrendingUp,
  Users
} from 'lucide-react';

interface MonthlyKPIs {
  totalDays: number;
  workDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  incidents: number;
  totalHours: number;
}

interface EmployeeAttendanceKPIsProps {
  kpis: MonthlyKPIs;
  employeeName: string;
  month: string;
}

export function EmployeeAttendanceKPIs({ kpis, employeeName, month }: EmployeeAttendanceKPIsProps) {
  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year || '2024'), parseInt(month || '1') - 1);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const attendanceRate = kpis.workDays > 0 ? Math.round((kpis.presentDays / kpis.workDays) * 100) : 0;
  const averageHoursPerDay = kpis.presentDays > 0 ? (kpis.totalHours / kpis.presentDays).toFixed(1) : '0';

  const kpiCards = [
    {
      title: 'Días Trabajados',
      value: kpis.presentDays,
      total: kpis.workDays,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Tardanzas',
      value: kpis.lateDays,
      total: kpis.workDays,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    {
      title: 'Ausencias',
      value: kpis.absentDays,
      total: kpis.workDays,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      title: 'Incidencias',
      value: kpis.incidents,
      total: kpis.workDays,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      title: 'Horas Trabajadas',
      value: kpis.totalHours.toFixed(1),
      total: null,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      unit: 'h'
    },
    {
      title: 'Promedio/Día',
      value: averageHoursPerDay,
      total: null,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      unit: 'h'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Asistencia de {employeeName}
          </h2>
          <p className="text-gray-600">
            {formatMonth(month)} • {kpis.workDays} días laborables
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-600">Tasa de Asistencia</p>
            <p className="text-2xl font-bold text-green-600">{attendanceRate}%</p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          const percentage = kpi.total ? Math.round((kpi.value / kpi.total) * 100) : null;
          
          return (
            <Card key={index} className={`p-4 border-l-4 ${kpi.borderColor} ${kpi.bgColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {kpi.title}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {kpi.value}
                    </span>
                    {kpi.unit && (
                      <span className="text-sm text-gray-500">
                        {kpi.unit}
                      </span>
                    )}
                    {kpi.total && (
                      <>
                        <span className="text-sm text-gray-500">
                          / {kpi.total}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({percentage}%)
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className={`p-2 rounded-full ${kpi.bgColor}`}>
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 

