'use client';

import { useState, useEffect } from 'react';
import { hrApi } from '@/lib/api/client';
import SpecialDayAssignmentsTable from '@/components/features/employees/SpecialDayAssignmentsTable';

interface SpecialDayAssignment {
  id: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    position: string | null;
    department: string | null;
  };
  date: string;
  type: 'GUARD' | 'HOLIDAY' | 'WEEKEND' | 'EMERGENCY' | 'OVERTIME';
  isMandatory: boolean;
  notes: string | null;
}

export default function SpecialAssignmentsPage() {
  const [assignments, setAssignments] = useState<SpecialDayAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await hrApi.get<{ specialAssignments?: SpecialDayAssignment[] }>('/employees/special-assignments');
      setAssignments(data.specialAssignments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asignaciones Especiales</h1>
          <p className="text-gray-600">
            Gestiona las asignaciones especiales de días para empleados
          </p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error al cargar asignaciones
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Asignaciones Especiales</h1>
        <p className="text-gray-600">
          Gestiona las asignaciones especiales de días para empleados
        </p>
      </div>
      
      <SpecialDayAssignmentsTable
        assignments={assignments}
        loading={loading}
        onRefresh={fetchAssignments}
      />
    </div>
  );
} 

