'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { hrApi } from '@/lib/api/client';
import EmployeeForm from '@/components/features/employees/EmployeeForm';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  email: string;
  phone: string | null;
  address: string | null;
  positionId: string;
  departmentId: string | null;
  birthDate: string | null;
  dateJoined: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export default function EditEmployeePage() {
  const params = useParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await hrApi.get<{ employee: Employee }>(`/employees/${params.id}`);
        setEmployee(data.employee);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchEmployee();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Empleado</h1>
          <p className="text-gray-600">Modifica la información del empleado</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Empleado</h1>
          <p className="text-gray-600">Modifica la información del empleado</p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error al cargar empleado
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

  if (!employee) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Empleado</h1>
          <p className="text-gray-600">Modifica la información del empleado</p>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Empleado no encontrado
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>El empleado que buscas no existe o no tienes permisos para editarlo.</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Editar Empleado</h1>
        <p className="text-gray-600">
          Modifica la información de {employee.firstName} {employee.lastName}
        </p>
      </div>
      
      <EmployeeForm 
        mode="edit" 
        employee={{
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          idNumber: employee.idNumber,
          email: employee.email,
          phone: employee.phone || '',
          address: employee.address || '',
          positionId: employee.positionId,
          department: employee.departmentId || '',
          birthDate: employee.birthDate ? employee.birthDate.split('T')[0] : new Date().toISOString().split('T')[0],
          dateJoined: employee.dateJoined ? employee.dateJoined.split('T')[0] : new Date().toISOString().split('T')[0],
          status: employee.status,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any}
      />
    </div>
  );
} 