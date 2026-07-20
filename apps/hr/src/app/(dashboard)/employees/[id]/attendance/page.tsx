'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@hubilee/ui';
import { EmployeeAttendanceKPIs } from '@/components/features/employees/EmployeeAttendanceKPIs';
import { EmployeeAttendanceTable } from '@/components/features/employees/EmployeeAttendanceTable';
import { useEmployeeAttendance } from '@/hooks/api/useEmployeeAttendance';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  AlertTriangle,
  Loader2
} from 'lucide-react';

export default function EmployeeAttendancePage() {
  const params = useParams();
  const employeeId = params.id as string;
  
  // Estado para el mes seleccionado
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data, loading, error, refetch } = useEmployeeAttendance(employeeId, selectedMonth);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = Number(yearStr) || new Date().getFullYear();
    const month = Number(monthStr) || 1;
    let newYear = year;
    let newMonth = month;

    if (direction === 'prev') {
      if (month === 1) {
        newMonth = 12;
        newYear = year - 1;
      } else {
        newMonth = month - 1;
      }
    } else {
      if (month === 12) {
        newMonth = 1;
        newYear = year + 1;
      } else {
        newMonth = month + 1;
      }
    }

    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const formatMonthDisplay = (monthString: string) => {
    const [yearStr, monthStr] = monthString.split('-');
    const year = Number(yearStr) || new Date().getFullYear();
    const month = Number(monthStr) || 1;
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/employees/${employeeId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al empleado
            </Button>
          </Link>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="text-lg font-medium text-red-800">
                Error al cargar la asistencia
              </h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={refetch} variant="outline" size="sm">
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/employees/${employeeId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al empleado
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Asistencia del Empleado
            </h1>
            {data && (
              <p className="text-gray-600">
                {data.employee.firstName} {data.employee.lastName} • {data.employee.position}
              </p>
            )}
          </div>
        </div>

        {/* Selector de mes */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMonthChange('prev')}
            disabled={loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="font-medium text-gray-900">
              {formatMonthDisplay(selectedMonth)}
            </span>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMonthChange('next')}
            disabled={loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {data && (
        <EmployeeAttendanceKPIs
          kpis={data.kpis}
          employeeName={`${data.employee.firstName} ${data.employee.lastName}`}
          month={data.month}
        />
      )}

      {/* Tabla de asistencia */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Detalle Diario
        </h3>
        <EmployeeAttendanceTable
          attendance={data?.attendance || []}
          loading={loading}
        />
      </div>
    </div>
  );
} 