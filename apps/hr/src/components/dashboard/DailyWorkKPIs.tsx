'use client';

import { useAttendanceStats } from '@/hooks/api/useAttendanceStats';
import { Badge, Card } from '@hubilee/ui';
import { 
  Users, 
  UserX, 
  Coffee,
  TrendingUp,
  AlertTriangle,
  Calendar,
  PartyPopper
} from 'lucide-react';

export function DailyWorkKPIs() {
  const { stats, loading, error } = useAttendanceStats();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 col-span-full">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">Error al cargar estadísticas: {error}</span>
          </div>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Si es un día no laborable, mostrar información especial
  if (!stats.isWorkDay) {
    return (
      <div className="space-y-4">
        {/* Indicador de día no laborable */}
        <Card className="p-6 border-l-4 border-purple-200 bg-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-purple-100">
                <PartyPopper className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-purple-900">
                  Día No Laborable
                </h3>
                <p className="text-sm text-purple-700">
                  {stats.workDayReason || 'Hoy no es un día laborable'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-purple-600 border-purple-300">
              Descanso
            </Badge>
          </div>
        </Card>

        {/* KPIs con valores en cero */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: 'Empleados Programados',
              value: 0,
              total: 0,
              icon: Users,
              color: 'bg-gray-500',
              textColor: 'text-gray-600',
              bgColor: 'bg-gray-50'
            },
            {
              title: 'Trabajando',
              value: 0,
              total: 0,
              icon: Users,
              color: 'bg-green-500',
              textColor: 'text-green-600',
              bgColor: 'bg-green-50'
            },
            {
              title: 'Ausentes',
              value: 0,
              total: 0,
              icon: UserX,
              color: 'bg-red-500',
              textColor: 'text-red-600',
              bgColor: 'bg-red-50'
            },
            {
              title: 'En Descanso',
              value: 0,
              total: 0,
              icon: Coffee,
              color: 'bg-blue-500',
              textColor: 'text-blue-600',
              bgColor: 'bg-blue-50'
            }
          ].map((kpi, index) => {
            const Icon = kpi.icon;
            
            return (
              <Card key={index} className="p-6 opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {kpi.title}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-400">
                        {kpi.value}
                      </span>
                      <span className="text-sm text-gray-400">
                        / {kpi.total}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        No aplica hoy
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full ${kpi.bgColor}`}>
                    <Icon className={`h-6 w-6 ${kpi.textColor}`} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // KPIs normales para días laborables
  const kpis = [
    {
      title: 'Programados',
      value: stats.employeesScheduled,
      total: stats.employeesScheduled,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Trabajando',
      value: stats.employeesWorking,
      total: stats.employeesScheduled,
      icon: Users,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Ausentes',
      value: stats.employeesAbsent,
      total: stats.employeesScheduled,
      icon: UserX,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'En Descanso',
      value: stats.employeesOnBreak,
      total: stats.employeesScheduled,
      icon: Coffee,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        const percentage = (kpi.total ?? 0) > 0 ? Math.round(((kpi.value ?? 0) / (kpi.total ?? 1)) * 100) : 0;
        
        return (
          <Card key={index} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {kpi.title}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {kpi.value}
                  </span>
                  <span className="text-sm text-gray-500">
                    / {kpi.total}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {percentage}% del total
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-full ${kpi.bgColor}`}>
                <Icon className={`h-6 w-6 ${kpi.textColor}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
} 
