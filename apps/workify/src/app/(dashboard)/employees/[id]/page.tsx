'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { workifyApi } from '@/lib/api/client';
import { Button } from '@hubilee/ui';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  email: string;
  phone: string | null;
  address: string | null;
  position: string | null;
  department: string | null;
  birthDate: string | null;
  dateJoined: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
  } | null;
}

export default function EmployeePage() {
  const params = useParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await workifyApi.get<{ employee: Employee }>(`/employees/${params.id}`);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-red-100 text-red-800';
      case 'SUSPENDED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Activo';
      case 'INACTIVE':
        return 'Inactivo';
      case 'SUSPENDED':
        return 'Suspendido';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
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
                <p>El empleado que buscas no existe o no tienes permisos para verlo.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-gray-600">{employee.position}</p>
        </div>
        <div className="flex space-x-3">
          <Link href="/employees">
            <Button variant="secondary">
              Volver
            </Button>
          </Link>
          <Link href={`/employees/${employee.id}/schedule`}>
            <Button variant="outline">
              Horarios
            </Button>
          </Link>
          <Link href={`/employees/${employee.id}/attendance`}>
            <Button variant="outline">
              Ver Asistencia
            </Button>
          </Link>
          <Link href={`/employees/${employee.id}/edit`}>
            <Button>
              Editar
            </Button>
          </Link>
        </div>
      </div>

      {/* Employee Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start space-x-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="h-20 w-20 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-2xl font-medium text-gray-700">
                {getInitials(employee.firstName, employee.lastName)}
              </span>
            </div>
          </div>

          {/* Basic Info */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Información Personal</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Nombre completo</dt>
                    <dd className="text-sm text-gray-900">{employee.firstName} {employee.lastName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Número de identificación</dt>
                    <dd className="text-sm text-gray-900">{employee.idNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900">{employee.email}</dd>
                  </div>
                  {employee.phone && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
                      <dd className="text-sm text-gray-900">{employee.phone}</dd>
                    </div>
                  )}
                  {employee.birthDate && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Fecha de nacimiento</dt>
                      <dd className="text-sm text-gray-900">{formatDate(employee.birthDate)}</dd>
                    </div>
                  )}
                  {employee.address && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Dirección</dt>
                      <dd className="text-sm text-gray-900">{employee.address}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Información Laboral</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Posición</dt>
                    <dd className="text-sm text-gray-900">{employee.position || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Departamento</dt>
                    <dd className="text-sm text-gray-900">{employee.department || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Estado</dt>
                    <dd>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(employee.status)}`}>
                        {getStatusText(employee.status)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Fecha de ingreso</dt>
                    <dd className="text-sm text-gray-900">{formatDate(employee.dateJoined)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Cuenta de usuario</dt>
                    <dd className="text-sm text-gray-900">
                      {employee.user ? 'Sí' : 'No'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* System Info */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Sistema</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Fecha de creación</dt>
                  <dd className="text-sm text-gray-900">{formatDate(employee.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Última actualización</dt>
                  <dd className="text-sm text-gray-900">{formatDate(employee.updatedAt)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 