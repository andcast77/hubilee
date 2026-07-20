'use client';

import { Badge, Card } from '@hubilee/ui';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

interface AttendanceDay {
  date: Date;
  dayOfWeek: number;
  dayName: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  clockIn: Date | null;
  clockOut: Date | null;
  status: 'not_scheduled' | 'present' | 'late' | 'absent';
  isLate: boolean;
  hasIncident: boolean;
  notes: string;
  isWorkDay: boolean;
}

interface EmployeeAttendanceTableProps {
  attendance: AttendanceDay[];
  loading?: boolean;
}

export function EmployeeAttendanceTable({ attendance, loading }: EmployeeAttendanceTableProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando datos de asistencia...</span>
        </div>
      </Card>
    );
  }

  const getStatusColor = (status: string, hasIncident: boolean) => {
    if (hasIncident) return 'bg-red-500';
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'late': return 'bg-yellow-500';
      case 'absent': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusText = (status: string, hasIncident: boolean) => {
    if (hasIncident) return 'Incidencia';
    switch (status) {
      case 'present': return 'Presente';
      case 'late': return 'Tarde';
      case 'absent': return 'Ausente';
      case 'not_scheduled': return 'No programado';
      default: return 'Desconocido';
    }
  };

  const getStatusIcon = (status: string, hasIncident: boolean) => {
    if (hasIncident) return <AlertTriangle className="h-4 w-4" />;
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4" />;
      case 'late': return <Clock className="h-4 w-4" />;
      case 'absent': return <XCircle className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return '-';
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit',
      month: '2-digit'
    });
  };

  const renderTimeBar = (day: AttendanceDay) => {
    if (!day.isWorkDay || !day.scheduledStart || !day.scheduledEnd) {
      return (
        <div className="w-full h-4 bg-gray-100 rounded flex items-center justify-center">
          <span className="text-xs text-gray-500">No programado</span>
        </div>
      );
    }

    const startMinutes = timeToMinutes(day.scheduledStart);
    const endMinutes = timeToMinutes(day.scheduledEnd);
    const totalMinutes = endMinutes > startMinutes ? endMinutes - startMinutes : (24 * 60 - startMinutes) + endMinutes;

    let barStart = 0;
    let barEnd = 0;
    let barColor = 'bg-gray-300';

    if (day.clockIn) {
      const clockInMinutes = day.clockIn.getHours() * 60 + day.clockIn.getMinutes();
      barStart = ((clockInMinutes - startMinutes + 24 * 60) % (24 * 60)) / totalMinutes * 100;
      let clockOutMinutes = 0;
      if (day.clockOut) {
        clockOutMinutes = day.clockOut.getHours() * 60 + day.clockOut.getMinutes();
        barEnd = ((clockOutMinutes - startMinutes + 24 * 60) % (24 * 60)) / totalMinutes * 100;
      } else {
        barEnd = 100; // Si no hay salida, la barra va hasta el final
      }

      // Ajustar para turnos nocturnos
      if (endMinutes < startMinutes) {
        if (clockInMinutes < startMinutes) {
          barStart = 0;
        }
        if (!day.clockOut || clockOutMinutes > endMinutes) {
          barEnd = 100;
        }
      }

      barColor = getStatusColor(day.status, day.hasIncident);
    }

    return (
      <div className="w-full h-4 bg-gray-100 rounded relative overflow-hidden">
        {/* Horario programado como fondo */}
        <div className="absolute inset-0 bg-blue-50 border border-blue-200 rounded"></div>
        
        {/* Barra de asistencia real */}
        {day.clockIn && (
          <div 
            className={`absolute h-full ${barColor} rounded transition-all duration-300`}
            style={{
              left: `${Math.max(0, barStart)}%`,
              width: `${Math.max(0, barEnd - barStart)}%`
            }}
          ></div>
        )}
        
        {/* Marcas de hora */}
        <div className="absolute inset-0 flex justify-between items-center px-1">
          <span className="text-xs text-gray-500">{day.scheduledStart}</span>
          <span className="text-xs text-gray-500">{day.scheduledEnd}</span>
        </div>
      </div>
    );
  };

  const timeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Horario
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Asistencia
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notas
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attendance.map((day, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900">
                      {day.dayName} {formatDate(day.date)}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {day.scheduledStart && day.scheduledEnd 
                      ? `${day.scheduledStart} - ${day.scheduledEnd}`
                      : '-'
                    }
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="space-y-1">
                    {renderTimeBar(day)}
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Entrada: {formatTime(day.clockIn)}</span>
                      <span>Salida: {formatTime(day.clockOut)}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge 
                    variant={
                      day.hasIncident ? 'destructive' :
                      day.status === 'present' ? 'default' :
                      day.status === 'late' ? 'secondary' :
                      'outline'
                    }
                    className="flex items-center gap-1"
                  >
                    {getStatusIcon(day.status, day.hasIncident)}
                    {getStatusText(day.status, day.hasIncident)}
                  </Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-500 max-w-xs truncate">
                    {day.notes || '-'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
} 

