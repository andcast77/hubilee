'use client';

import { useState, useEffect } from 'react';
import { hrApi } from '@/lib/api/client';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@hubilee/ui';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  department: string | null;
}

interface SpecialDayAssignmentFormData {
  employeeId: string;
  date: string | undefined;
  type: 'GUARD' | 'HOLIDAY' | 'WEEKEND' | 'EMERGENCY' | 'OVERTIME';
  isMandatory: boolean;
  notes: string;
}

interface SpecialDayAssignmentFormProps {
  assignment?: Partial<SpecialDayAssignmentFormData> & { id?: string };
  mode: 'create' | 'edit';
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ASSIGNMENT_TYPES = [
  { value: 'GUARD', label: 'Guardia' },
  { value: 'HOLIDAY', label: 'Feriado' },
  { value: 'WEEKEND', label: 'Fin de Semana' },
  { value: 'EMERGENCY', label: 'Emergencia' },
  { value: 'OVERTIME', label: 'Horas Extra' },
];

export default function SpecialDayAssignmentForm({ 
  assignment, 
  mode, 
  onSuccess, 
  onCancel 
}: SpecialDayAssignmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  
  const [formData, setFormData] = useState<SpecialDayAssignmentFormData>({
    employeeId: assignment?.employeeId || '',
    date: assignment?.date || new Date().toISOString().split('T')[0],
    type: assignment?.type || 'GUARD',
    isMandatory: assignment?.isMandatory ?? true,
    notes: assignment?.notes || '',
  });

  // Cargar empleados
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const data = await hrApi.get<{ employees: Employee[] }>('/employees?limit=500');
        setEmployees(data.employees || []);
      } catch (err) {
        setError('Error al cargar la lista de empleados');
        console.error('Error fetching employees:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.employeeId) {
      setError('Debe seleccionar un empleado');
      return false;
    }
    if (!formData.date) {
      setError('La fecha es requerida');
      return false;
    }
    if (!formData.type) {
      setError('El tipo de asignación es requerido');
      return false;
    }
    
    // Validar que la fecha no sea en el pasado
    const selectedDate = new Date(formData.date || ''); // Use empty string for new Date()
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      setError('No se puede asignar fechas en el pasado');
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'create') {
        await hrApi.post('/employees/special-assignments', formData);
      } else {
        await hrApi.put(`/employees/special-assignments/${assignment?.id}`, formData);
      }
      
      // Llamar callback de éxito
      onSuccess?.();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
  };

  const getEmployeeDisplayName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return '';
    return `${employee.firstName} ${employee.lastName} - ${employee.position || 'Sin posición'}`;
  };

  if (loadingEmployees) {
    return (
      <div className="space-y-6">
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error al guardar asignación
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {mode === 'create' ? 'Nueva Asignación Especial' : 'Editar Asignación'}
        </h3>
        
        <div className="space-y-4">
          {/* Empleado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Empleado *
            </label>
            <Select 
              value={formData.employeeId} 
              onValueChange={(value) => handleSelectChange('employeeId', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {formData.employeeId ? getEmployeeDisplayName(formData.employeeId) : "Seleccionar empleado"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} - {employee.position || 'Sin posición'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.employeeId && (
              <p className="mt-1 text-sm text-gray-500">
                {getEmployeeDisplayName(formData.employeeId)}
              </p>
            )}
          </div>

          {/* Fecha */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha *
            </label>
            <Input
              type="date"
              id="date"
              name="date"
              value={formData.date || ''}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* Tipo de Asignación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Asignación *
            </label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => handleSelectChange('type', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Obligatorio */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isMandatory"
              name="isMandatory"
              checked={formData.isMandatory}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isMandatory" className="ml-2 block text-sm text-gray-700">
              Asignación obligatoria
            </label>
          </div>

          {/* Notas */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Descripción adicional de la asignación..."
            />
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={loading}
          disabled={loading}
        >
          {loading 
            ? (mode === 'create' ? 'Creando...' : 'Guardando...') 
            : (mode === 'create' ? 'Crear Asignación' : 'Guardar Cambios')
          }
        </Button>
      </div>
    </form>
  );
} 

